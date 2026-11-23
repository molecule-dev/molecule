// @vitest-environment jsdom

/**
 * A sign-in flow that settles after the component unmounts still establishes
 * the session, but calls none of the unmounted view's callbacks. This is
 * React's `useOAuth.unmount.test.tsx` against the Angular function; every
 * title is React's. Only the framework-forced mechanics change: a function
 * runs in an injection context (a component field initializer) instead of a
 * hook, and destroying the fixture replaces React's unmount. StrictMode has no
 * Angular counterpart, so its case ports what a caller observes: the mount-time
 * exchange reports its success exactly once.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'

import { createTestAuthClient } from '../../__tests__/helpers/test-providers.js'
import { provideMolecule } from '../../providers.js'
import { useOAuth, type UseOAuthConfig, type UseOAuthReturn } from '../use-auth-flows.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'
const originalLocation = window.location

/** The config the probe component's function is created with. */
let activeConfig: UseOAuthConfig = {}
/** The most recently created OAuth result. */
let activeOAuth: UseOAuthReturn | null = null
/** The auth client the module provides to the probe. */
let client: AuthClient<unknown>

/** A popup window as the hook uses it: its closed flag and the two actions. */
interface FakePopup {
  closed: boolean
  close: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
}

/** The browser's own `window.open`, restored after each case. */
const originalOpen = window.open

/**
 * Replaces `window.open` with a stub returning the given popup (or `null` for a
 * blocked popup). The stub is a function of `window.open`'s own shape, so no
 * cast is needed.
 *
 * @param popup - What the stub returns.
 */
function stubOpen(popup: FakePopup | null): void {
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: (_url?: string | URL, _target?: string, _features?: string) => popup,
  })
}

/** Runs the OAuth function once for the module's providers. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-oauth-unmount-probe',
  template: '',
})
class OAuthUnmountProbeComponent {
  readonly oauth: UseOAuthReturn = useOAuth(activeConfig)

  constructor() {
    activeOAuth = this.oauth
  }
}

/**
 * Mounts the probe component and renders it once.
 *
 * @returns The mounted fixture.
 */
function mount(): ComponentFixture<OAuthUnmountProbeComponent> {
  TestBed.configureTestingModule({
    imports: [OAuthUnmountProbeComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(OAuthUnmountProbeComponent)
  fixture.detectChanges()
  // Bootstrap's session hold (provideMolecule's default with `auth`) starts the restore once;
  // the assertions count what the OAuth result itself does.
  vi.mocked(client.initialize).mockClear()
  return fixture
}

/**
 * The OAuth result created by the last mount.
 *
 * @returns The result.
 */
function oauth(): UseOAuthReturn {
  if (!activeOAuth) throw new Error('the OAuth probe was not mounted')
  return activeOAuth
}

/**
 * Builds a message event with a forced origin and source (jsdom-reliable).
 *
 * @param source - The window the message claims to come from.
 * @param data - The message payload.
 * @returns The event.
 */
function makeMessage(source: unknown, data: unknown): MessageEvent {
  const event = new MessageEvent('message', { data })
  Object.defineProperty(event, 'origin', { value: ORIGIN })
  Object.defineProperty(event, 'source', { value: source })
  return event
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * A successful exchange response carrying a bearer token and a user.
 *
 * @returns A minimal `Response`-shaped object.
 */
function exchangeOk(): unknown {
  return {
    ok: true,
    json: async () => ({ props: { id: 'u1' } }),
    headers: { get: (name: string) => (name === 'authorization' ? 'Bearer tok' : null) },
  }
}

/**
 * Sets `window.location` to a URL with the given query string.
 *
 * @param search - Query string including the leading `?`.
 */
function setLocationWithSearch(search: string): void {
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: originalOpen,
  })
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: new URL(`http://localhost${search}`),
  })
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  client = createTestAuthClient()
  activeConfig = {}
  activeOAuth = null
  // The callback cases run on a stubbed location URL; the browser refuses a
  // history update to it, so record it rather than letting jsdom throw.
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  TestBed.resetTestingModule()
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: originalLocation,
  })
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth.loginViaPopup after unmount', () => {
  it('establishes the session from a later result and calls no callback', async () => {
    const popup: FakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(popup)
    const onSuccess = vi.fn()
    activeConfig = { oauthProviders: ['github'], onSuccess }
    const fixture = mount()
    oauth().loginViaPopup('github')
    fixture.destroy()

    window.dispatchEvent(
      makeMessage(popup, { type: TYPE, ok: true, token: 'tok', user: { id: 'u1' } }),
    )
    await settle()

    expect(client.setAccessToken).toHaveBeenCalledWith('tok')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls no onError for a failure that arrives later', async () => {
    const popup: FakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(popup)
    const onError = vi.fn()
    activeConfig = { oauthProviders: ['github'], onError }
    const fixture = mount()
    oauth().loginViaPopup('github')
    fixture.destroy()

    window.dispatchEvent(makeMessage(popup, { type: TYPE, ok: false, error: 'denied' }))
    await settle()

    expect(onError).not.toHaveBeenCalled()
    expect(popup.close).toHaveBeenCalled()
  })
})

describe('useOAuth callback exchange', () => {
  it('reports success once under StrictMode', async () => {
    setLocationWithSearch('/login?code=abc&state=s1')
    sessionStorage.setItem('oauth_provider', 'github')
    const fetchMock = vi.fn(async () => exchangeOk())
    vi.stubGlobal('fetch', fetchMock)
    const onSuccess = vi.fn()
    activeConfig = { onSuccess }

    mount()

    const deadline = Date.now() + 2000
    while (onSuccess.mock.calls.length === 0 && Date.now() < deadline) {
      await settle()
    }
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
  })

  it('establishes the session when it settles after unmount, and calls no callback', async () => {
    setLocationWithSearch('/login?code=abc&state=s1')
    sessionStorage.setItem('oauth_provider', 'github')
    let answer: (response: unknown) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      ),
    )
    const onSuccess = vi.fn()
    activeConfig = { onSuccess }
    const fixture = mount()
    fixture.destroy()

    answer(exchangeOk())
    await settle()

    expect(client.setAccessToken).toHaveBeenCalledWith('tok')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
