// @vitest-environment jsdom

/**
 * Security tests for the OAuth-popup relay in {@link useOAuth}, run against the
 * Angular function. Every title is React's `useOAuth.popup.test.tsx`; only the
 * framework-forced mechanics change: a function runs in an injection context
 * (a component field initializer) instead of a hook.
 *
 * The opener establishes a session from a `postMessage` the popup sends back.
 * The WHOLE security of the popup flow rests on the opener accepting that
 * message ONLY when it is same-origin, from the exact popup window it opened,
 * and carries our private message type. These tests prove a forged message of
 * each kind is rejected and only the genuine one establishes a session.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import { createSimpleI18nProvider, getProvider, setProvider } from '@molecule/app-i18n'

import { createTestAuthClient } from '../../__tests__/helpers/test-providers.js'
import { provideMolecule } from '../../providers.js'
import { useOAuth, type UseOAuthConfig, type UseOAuthReturn } from '../use-auth-flows.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

/** The config the probe component's function is created with. */
let activeConfig: UseOAuthConfig = {}
/** The most recently created OAuth result. */
let activeOAuth: UseOAuthReturn | null = null
/** The auth client the module provides to the probe. */
let client: AuthClient<unknown>

/** Runs the OAuth function once for the module's providers. */
@Component({ selector: 'app-test-oauth-popup-probe', template: '' })
class OAuthPopupProbeComponent {
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
function mount(): ComponentFixture<OAuthPopupProbeComponent> {
  TestBed.configureTestingModule({
    imports: [OAuthPopupProbeComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(OAuthPopupProbeComponent)
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
 * Builds a message event with forced origin and source (jsdom-reliable).
 *
 * @param opts - The claimed origin, source window and payload.
 * @returns The event.
 */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const event = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(event, 'origin', { value: opts.origin ?? ORIGIN })
  Object.defineProperty(event, 'source', { value: opts.source })
  return event
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

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

let fakePopup: FakePopup
let previousI18n: ReturnType<typeof getProvider>

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.clearAllMocks()
  client = createTestAuthClient()
  activeConfig = {}
  activeOAuth = null
  fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
  stubOpen(fakePopup)
  previousI18n = getProvider()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

afterEach(() => {
  TestBed.resetTestingModule()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: originalOpen,
  })
  setProvider(previousI18n)
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth.loginViaPopup — postMessage relay security', () => {
  /**
   * Mounts the probe and kicks off a popup login, so each case can drive the
   * `message` handling that follows.
   *
   * @param onSuccess - Success callback passed to the function.
   * @param onError - Error callback passed to the function.
   */
  function startPopup(onSuccess?: () => void, onError?: (message: string) => void): void {
    activeConfig = {
      oauthProviders: ['github'],
      ...(onSuccess ? { onSuccess } : {}),
      ...(onError ? { onError } : {}),
    }
    mount()
    oauth().loginViaPopup('github')
  }

  const VALID = { type: TYPE, ok: true, token: 'real-token', user: { id: 'u1' } }

  it('accepts a same-origin result from OUR popup and establishes the session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await settle()
    expect(client.setAccessToken).toHaveBeenCalledWith('real-token')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fakePopup.close).toHaveBeenCalled()
  })

  it('REJECTS a cross-origin message (session fixation attempt) — no session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: 'https://evil.example',
        source: fakePopup,
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await settle()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(client.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('REJECTS a same-origin message from a DIFFERENT window (source mismatch)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: { closed: false },
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await settle()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('IGNORES a same-origin message from our popup with the WRONG type', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: 'other', ok: true, token: 'x', user: { id: 'z' } },
      }),
    )
    await settle()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('relays an error result to onError without establishing a session', async () => {
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: TYPE, ok: false, error: 'denied' },
      }),
    )
    await settle()
    expect(onError).toHaveBeenCalledWith('denied')
    expect(client.setAccessToken).not.toHaveBeenCalled()
  })

  it('treats a success result with no user as a failure (no half-auth)', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    startPopup(onSuccess, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: TYPE, ok: true, token: 'tok', user: null },
      }),
    )
    await settle()
    expect(client.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('processes only the FIRST valid result (no double-handling)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await settle()
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await settle()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(client.initialize).toHaveBeenCalledTimes(1)
  })

  it('reports a failure without a reason in the active language', async () => {
    setProvider(
      createSimpleI18nProvider('fr', [
        {
          code: 'fr',
          name: 'French',
          translations: { 'angular.error.oauthFailed': 'Échec de la connexion OAuth' },
        },
      ]),
    )
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({ origin: ORIGIN, source: fakePopup, data: { type: TYPE, ok: false } }),
    )
    await settle()
    expect(onError).toHaveBeenCalledWith('Échec de la connexion OAuth')
  })
})
