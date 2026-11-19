// @vitest-environment jsdom

/**
 * `useOAuth`'s `navigate` option receives every page navigation the function
 * makes: the full-page redirect and the fallback when the popup is blocked.
 * This is React's `useOAuth.navigate.test.tsx` against the Angular function;
 * each title is React's. Only the framework-forced mechanics change: a
 * function runs in an injection context (a component field initializer)
 * instead of a hook.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestAuthClient } from '../../__tests__/helpers/test-providers.js'
import { provideMolecule } from '../../providers.js'
import { useOAuth, type UseOAuthConfig, type UseOAuthReturn } from '../use-auth-flows.js'

/** The config the probe component's function is created with. */
let activeConfig: UseOAuthConfig = {}

/** The most recently created OAuth result. */
let activeOAuth: UseOAuthReturn | null = null

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
@Component({ selector: 'app-test-oauth-navigate-probe', template: '' })
class OAuthNavigateProbeComponent {
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
function mount(): ComponentFixture<OAuthNavigateProbeComponent> {
  TestBed.configureTestingModule({
    imports: [OAuthNavigateProbeComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideMolecule({ auth: createTestAuthClient() }),
    ],
  })
  const fixture = TestBed.createComponent(OAuthNavigateProbeComponent)
  fixture.detectChanges()
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

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  activeConfig = {}
  activeOAuth = null
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
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth navigate option', () => {
  it('receives the redirect to the provider, with the return path', () => {
    window.history.replaceState({}, '', '/login')
    const navigate = vi.fn<(url: string) => void>()
    activeConfig = {
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
      navigate,
    }
    mount()

    oauth().redirect('github')

    expect(navigate).toHaveBeenCalledWith(
      'https://api.example.com/oauth/github?redirect_to=%2Flogin',
    )
    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })

  it('receives the fallback when the popup is blocked', () => {
    stubOpen(null)
    const navigate = vi.fn<(url: string) => void>()
    activeConfig = { oauthProviders: ['google'], navigate }
    mount()

    oauth().loginViaPopup('google')

    expect(navigate).toHaveBeenCalledWith('/oauth/google')
  })

  it('is not called when the popup opens', () => {
    const popup: FakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(popup)
    const navigate = vi.fn<(url: string) => void>()
    activeConfig = { oauthProviders: ['google'], navigate }
    const fixture = mount()

    oauth().loginViaPopup('google')

    expect(navigate).not.toHaveBeenCalled()
    fixture.destroy()
  })
})
