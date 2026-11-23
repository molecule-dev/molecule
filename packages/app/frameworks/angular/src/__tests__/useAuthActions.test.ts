// @vitest-environment jsdom

/**
 * The auth-flow contract React's `useAuthActions.test.tsx` pins, run against
 * the Angular functions. Every title is the React test's; only the
 * framework-forced mechanics change: a function runs in an injection context
 * (a component field initializer) instead of a hook, and the returned state
 * fields are read live off the result object rather than off a re-render.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'

import {
  useChangePassword,
  useLogin,
  useOAuth,
  usePasswordReset,
  useSignup,
} from '../hooks/index.js'
import { provideMolecule } from '../providers.js'

/** The user profile this suite's auth client stands in for. */
type User = { id: string; email: string }

/**
 * Creates a mock auth client with configurable behavior.
 *
 * @returns A mock AuthClient instance for testing.
 */
function createMockAuthClient(): AuthClient<User> {
  let currentUser: User | null = null
  let authenticated = false
  const listeners = new Set<() => void>()

  const getState = (): AuthState<User> => ({
    status: authenticated ? 'authenticated' : 'unauthenticated',
    initialized: true,
    authenticated,
    user: currentUser,
    loading: false,
    error: null,
  })

  return {
    getState,
    isAuthenticated: () => authenticated,
    getUser: () => currentUser,
    getAccessToken: () => (authenticated ? 'mock-access-token' : null),
    setAccessToken: vi.fn<AuthClient<User>['setAccessToken']>(),
    setSession: vi.fn<AuthClient<User>['setSession']>().mockImplementation((session) => {
      currentUser = session.user
      authenticated = session.user !== null
      listeners.forEach((listener) => listener())
    }),
    setUser: vi.fn<AuthClient<User>['setUser']>().mockImplementation((user) => {
      currentUser = user
    }),
    getRefreshToken: () => (authenticated ? 'mock-refresh-token' : null),
    login: vi.fn<AuthClient<User>['login']>().mockImplementation(async () => {
      currentUser = { id: '1', email: 'test@example.com' }
      authenticated = true
      listeners.forEach((listener) => listener())
      return {
        user: currentUser,
        accessToken: 'mock-token',
        expiresAt: Date.now() + 3600000,
      }
    }),
    logout: vi.fn<AuthClient<User>['logout']>().mockImplementation(async () => {
      currentUser = null
      authenticated = false
      listeners.forEach((listener) => listener())
    }),
    register: vi.fn<AuthClient<User>['register']>().mockImplementation(async () => {
      currentUser = { id: '2', email: 'new@example.com' }
      authenticated = true
      listeners.forEach((listener) => listener())
      return {
        user: currentUser,
        accessToken: 'mock-token',
        expiresAt: Date.now() + 3600000,
      }
    }),
    refresh: vi.fn<AuthClient<User>['refresh']>().mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'refreshed-token',
    }),
    requestPasswordReset: vi
      .fn<AuthClient<User>['requestPasswordReset']>()
      .mockResolvedValue(undefined),
    confirmPasswordReset: vi
      .fn<AuthClient<User>['confirmPasswordReset']>()
      .mockResolvedValue(undefined),
    updateProfile: vi.fn<AuthClient<User>['updateProfile']>(),
    changePassword: vi.fn<AuthClient<User>['changePassword']>().mockResolvedValue(undefined),
    initialize: vi.fn<AuthClient<User>['initialize']>().mockResolvedValue(undefined),
    subscribe: (callback) => {
      listeners.add(() => callback(getState()))
      return () => listeners.clear()
    },
    onAuthChange: (callback) => {
      listeners.add(() => callback(getState()))
      return () => listeners.clear()
    },
    addEventListener: vi.fn<AuthClient<User>['addEventListener']>().mockReturnValue(() => {}),
    destroy: vi.fn<AuthClient<User>['destroy']>(),
  }
}

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe injects (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

// The redirect stores `oauth_provider` in session storage. Clear it after every test, or a
// callback test that expects none reads the value an earlier test left.
afterEach(() => {
  TestBed.resetTestingModule()
  sessionStorage.clear()
})

describe('useLogin', () => {
  let client: AuthClient<User>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    /** Reads the tracked login state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-login-probe',
      template: '',
    })
    class LoginProbeComponent {
      readonly login = useLogin<User>()
    }

    const fixture = mount(LoginProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.login

    expect(result.status).toBe('idle')
    expect(result.value).toBeNull()
    expect(result.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful login', async () => {
    /** Reads the tracked login state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-login-success-probe',
      template: '',
    })
    class LoginSuccessProbeComponent {
      readonly login = useLogin<User>()
    }

    const fixture = mount(LoginSuccessProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.login

    expect(result.status).toBe('idle')

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(result.status).toBe('resolved')
    expect(result.value).toBeTruthy()
    expect(result.value?.user).toEqual({ id: '1', email: 'test@example.com' })
    expect(result.error).toBeNull()
    expect(client.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' })
  })

  it('should transition idle -> pending -> rejected on failed login', async () => {
    vi.mocked(client.login).mockRejectedValue(new Error('Invalid credentials'))

    /** Reads the tracked login state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-login-failure-probe',
      template: '',
    })
    class LoginFailureProbeComponent {
      readonly login = useLogin<User>()
    }

    const fixture = mount(LoginFailureProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.login

    expect(result.status).toBe('idle')

    try {
      await result.login({ email: 'test@example.com', password: 'wrong' })
    } catch (_error) {
      // Expected rejection — the function records the error in result.error
    }

    expect(result.status).toBe('rejected')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Invalid credentials')
    expect(result.value).toBeNull()
  })

  it('should reset state to idle', async () => {
    /** Reads the tracked login state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-login-reset-probe',
      template: '',
    })
    class LoginResetProbeComponent {
      readonly login = useLogin<User>()
    }

    const fixture = mount(LoginResetProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.login

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(result.status).toBe('resolved')

    result.reset()

    expect(result.status).toBe('idle')
    expect(result.value).toBeNull()
    expect(result.error).toBeNull()
  })
})

describe('useSignup', () => {
  let client: AuthClient<User>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    /** Reads the tracked signup state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-signup-probe',
      template: '',
    })
    class SignupProbeComponent {
      readonly signup = useSignup<User>()
    }

    const fixture = mount(SignupProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.signup

    expect(result.status).toBe('idle')
    expect(result.value).toBeNull()
    expect(result.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful signup', async () => {
    /** Reads the tracked signup state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-signup-success-probe',
      template: '',
    })
    class SignupSuccessProbeComponent {
      readonly signup = useSignup<User>()
    }

    const fixture = mount(SignupSuccessProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.signup

    await result.signup({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })

    expect(result.status).toBe('resolved')
    expect(result.value).toBeTruthy()
    expect(result.value?.user).toEqual({ id: '2', email: 'new@example.com' })
    expect(result.error).toBeNull()
    expect(client.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })
  })

  it('should transition idle -> pending -> rejected on failed signup', async () => {
    vi.mocked(client.register).mockRejectedValue(new Error('Email already exists'))

    /** Reads the tracked signup state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-signup-failure-probe',
      template: '',
    })
    class SignupFailureProbeComponent {
      readonly signup = useSignup<User>()
    }

    const fixture = mount(SignupFailureProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.signup

    try {
      await result.signup({ email: 'existing@example.com', password: 'password' })
    } catch (_error) {
      // Expected rejection — the function records the error in result.error
    }

    expect(result.status).toBe('rejected')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Email already exists')
  })
})

describe('useChangePassword', () => {
  let client: AuthClient<User>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    /** Reads the tracked change-password state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-change-probe',
      template: '',
    })
    class ChangeProbeComponent {
      readonly change = useChangePassword()
    }

    const fixture = mount(ChangeProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.change

    expect(result.status).toBe('idle')
    expect(result.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful change', async () => {
    /** Reads the tracked change-password state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-change-success-probe',
      template: '',
    })
    class ChangeSuccessProbeComponent {
      readonly change = useChangePassword()
    }

    const fixture = mount(ChangeSuccessProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.change

    await result.changePassword('oldPass', 'newPass')

    expect(result.status).toBe('resolved')
    expect(result.error).toBeNull()
    expect(client.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
  })

  it('should transition idle -> pending -> rejected on failed change', async () => {
    vi.mocked(client.changePassword).mockRejectedValue(new Error('Incorrect old password'))

    /** Reads the tracked change-password state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-change-failure-probe',
      template: '',
    })
    class ChangeFailureProbeComponent {
      readonly change = useChangePassword()
    }

    const fixture = mount(ChangeFailureProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.change

    try {
      await result.changePassword('wrongOld', 'newPass')
    } catch (_error) {
      // Expected rejection — the function records the error in result.error
    }

    expect(result.status).toBe('rejected')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Incorrect old password')
  })
})

describe('usePasswordReset', () => {
  let client: AuthClient<User>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start with both states idle', () => {
    /** Reads both halves of the reset flow. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-reset-probe',
      template: '',
    })
    class ResetProbeComponent {
      readonly reset = usePasswordReset()
    }

    const fixture = mount(ResetProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.reset

    expect(result.requestStatus).toBe('idle')
    expect(result.requestError).toBeNull()
    expect(result.confirmStatus).toBe('idle')
    expect(result.confirmError).toBeNull()
  })

  it('should track request and confirm steps independently', async () => {
    /** Reads both halves of the reset flow. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-reset-steps-probe',
      template: '',
    })
    class ResetStepsProbeComponent {
      readonly reset = usePasswordReset()
    }

    const fixture = mount(ResetStepsProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.reset

    // Request step
    await result.requestReset({ email: 'test@example.com' })

    expect(result.requestStatus).toBe('resolved')
    expect(result.confirmStatus).toBe('idle')
    expect(client.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@example.com' })

    // Confirm step
    await result.confirmReset({ token: 'reset-token', password: 'newPassword' })

    expect(result.requestStatus).toBe('resolved')
    expect(result.confirmStatus).toBe('resolved')
    expect(client.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'newPassword',
    })
  })

  it('should reset both states', async () => {
    /** Reads both halves of the reset flow. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-reset-clear-probe',
      template: '',
    })
    class ResetClearProbeComponent {
      readonly reset = usePasswordReset()
    }

    const fixture = mount(ResetClearProbeComponent, provideMolecule({ auth: client }))
    const result = fixture.componentInstance.reset

    await result.requestReset({ email: 'test@example.com' })
    await result.confirmReset({ token: 'token', password: 'pass' })

    expect(result.requestStatus).toBe('resolved')
    expect(result.confirmStatus).toBe('resolved')

    result.reset()

    expect(result.requestStatus).toBe('idle')
    expect(result.requestError).toBeNull()
    expect(result.confirmStatus).toBe('idle')
    expect(result.confirmError).toBeNull()
  })
})

describe('useOAuth', () => {
  let client: AuthClient<User>
  const originalLocation = window.location

  beforeEach(() => {
    client = createMockAuthClient()
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  it('should return providers from config', () => {
    /** Reads the configured OAuth providers. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-providers-probe',
      template: '',
    })
    class OAuthProvidersProbeComponent {
      readonly oauth = useOAuth({ oauthProviders: ['github', 'google', 'gitlab'] })
    }

    const fixture = mount(OAuthProvidersProbeComponent, provideMolecule({ auth: client }))

    expect(fixture.componentInstance.oauth.providers).toEqual(['github', 'google', 'gitlab'])
  })

  it('should return empty providers when none configured', () => {
    /** Reads the configured OAuth providers. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-empty-probe',
      template: '',
    })
    class OAuthEmptyProbeComponent {
      readonly oauth = useOAuth()
    }

    const fixture = mount(OAuthEmptyProbeComponent, provideMolecule({ auth: client }))

    expect(fixture.componentInstance.oauth.providers).toEqual([])
  })

  it('should build correct OAuth URL', () => {
    /** Builds OAuth initiation URLs from the config. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-url-probe',
      template: '',
    })
    class OAuthUrlProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        oauthEndpoint: '/auth/oauth',
      })
    }

    const fixture = mount(OAuthUrlProbeComponent, provideMolecule({ auth: client }))

    expect(fixture.componentInstance.oauth.getOAuthUrl('github')).toBe(
      'https://api.example.com/auth/oauth/github',
    )
  })

  it('should use default oauth endpoint', () => {
    /** Builds OAuth initiation URLs from the config. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-default-probe',
      template: '',
    })
    class OAuthDefaultProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['google'],
      })
    }

    const fixture = mount(OAuthDefaultProbeComponent, provideMolecule({ auth: client }))

    expect(fixture.componentInstance.oauth.getOAuthUrl('google')).toBe(
      'https://api.example.com/oauth/google',
    )
  })

  it('should redirect to provider URL', () => {
    /** Builds OAuth initiation URLs from the config. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-redirect-probe',
      template: '',
    })
    class OAuthRedirectProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    const fixture = mount(OAuthRedirectProbeComponent, provideMolecule({ auth: client }))

    fixture.componentInstance.oauth.redirect('github')

    expect(window.location.href).toBe('https://api.example.com/oauth/github')
  })

  it('should store oauth_provider in sessionStorage on redirect', () => {
    /** Builds OAuth initiation URLs from the config. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-stash-probe',
      template: '',
    })
    class OAuthStashProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    const fixture = mount(OAuthStashProbeComponent, provideMolecule({ auth: client }))

    fixture.componentInstance.oauth.redirect('github')

    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })
})

describe('useOAuth callback detection', () => {
  let client: AuthClient<User>
  let replaceStateSpy: ReturnType<typeof vi.spyOn>
  let fetchSpy: ReturnType<typeof vi.spyOn>
  const originalLocation = window.location

  beforeEach(() => {
    client = createMockAuthClient()
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    replaceStateSpy.mockRestore()
    fetchSpy.mockRestore()
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  /**
   * Sets window.location to a URL with the given search params.
   *
   * @param search - Query string including leading '?'.
   */
  function setLocationWithSearch(search: string): void {
    const url = `http://localhost${search}`
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: new URL(url),
    })
  }

  /**
   * Lets the mount-time callback exchange's promise chain settle.
   *
   * @returns A promise resolved after the chain's microtasks and timers run.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  it('should detect callback when URL has code and state params', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-detect-probe',
      template: '',
    })
    class OAuthDetectProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    mount(OAuthDetectProbeComponent, provideMolecule({ auth: client }))

    // Wait for the async exchangeCode to fire
    await settle()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/users/log-in/oauth',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('"code":"abc123"'),
      }),
    )
  })

  it('routes the OAuth token through setAccessToken, NOT localStorage [P5FE-31]', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', authorization: 'Bearer the-token-123' },
      }),
    )
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-token-probe',
      template: '',
    })
    class OAuthTokenProbeComponent {
      readonly oauth = useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    }

    mount(OAuthTokenProbeComponent, provideMolecule({ auth: client }))
    await settle()

    // Token goes to the in-memory adapter via the client, never to localStorage.
    expect(client.setAccessToken).toHaveBeenCalledWith('the-token-123')
    expect(setItemSpy).not.toHaveBeenCalledWith('molecule:auth:accessToken', expect.anything())
    setItemSpy.mockRestore()
  })

  it('should clean URL after processing callback', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-clean-probe',
      template: '',
    })
    class OAuthCleanProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    mount(OAuthCleanProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(replaceStateSpy).toHaveBeenCalled()
    const cleanedUrl = String(replaceStateSpy.mock.calls[0][2])
    expect(cleanedUrl).not.toContain('code=')
    expect(cleanedUrl).not.toContain('state=')
  })

  it('should not process callback when sessionStorage has no oauth_provider', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    // Intentionally NOT setting sessionStorage oauth_provider

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-noprovider-probe',
      template: '',
    })
    class OAuthNoProviderProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    mount(OAuthNoProviderProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should call onError when code exchange fails', async () => {
    setLocationWithSearch('?code=bad_code&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid authorization code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const onError = vi.fn()

    /** Runs the OAuth callback detection with the error callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-error-probe',
      template: '',
    })
    class OAuthErrorProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onError,
      })
    }

    mount(OAuthErrorProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(onError).toHaveBeenCalledWith('Invalid authorization code')
  })

  it('should call onSuccess after successful code exchange', async () => {
    setLocationWithSearch('?code=good_code&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const onSuccess = vi.fn()

    /** Runs the OAuth callback detection with the success callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-success-probe',
      template: '',
    })
    class OAuthSuccessProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onSuccess,
      })
    }

    mount(OAuthSuccessProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(onSuccess).toHaveBeenCalled()
  })

  it('should handle network errors gracefully in code exchange', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const onError = vi.fn()

    /** Runs the OAuth callback detection with the error callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-network-probe',
      template: '',
    })
    class OAuthNetworkProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onError,
      })
    }

    mount(OAuthNetworkProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(onError).toHaveBeenCalledWith('Network error')
  })

  it('should remove oauth_provider from sessionStorage after processing', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-remove-probe',
      template: '',
    })
    class OAuthRemoveProbeComponent {
      readonly oauth = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    }

    mount(OAuthRemoveProbeComponent, provideMolecule({ auth: client }))

    await settle()

    expect(sessionStorage.getItem('oauth_provider')).toBeNull()
  })

  it('establishes the authenticated session (setUser + initialize) after a successful exchange', async () => {
    // Without this the client only has the access token: `authenticated` stays
    // false and route guards bounce the user to /login despite a valid session.
    setLocationWithSearch('?code=good_code&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '7', email: 'gh@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', authorization: 'Bearer tok-7' },
      }),
    )

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-session-probe',
      template: '',
    })
    class OAuthSessionProbeComponent {
      readonly oauth = useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    }

    mount(OAuthSessionProbeComponent, provideMolecule({ auth: client }))
    await settle()

    expect(client.setAccessToken).toHaveBeenCalledWith('tok-7')
    expect(client.setUser).toHaveBeenCalledWith({ id: '7', email: 'gh@example.com' })
    expect(client.initialize).toHaveBeenCalled()
  })

  it('reads the user from `props` (molecule resource convention)', async () => {
    setLocationWithSearch('?code=good_code&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ props: { id: '42', email: 'p@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    /** Runs the OAuth callback detection on mount. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-oauth-props-probe',
      template: '',
    })
    class OAuthPropsProbeComponent {
      readonly oauth = useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    }

    mount(OAuthPropsProbeComponent, provideMolecule({ auth: client }))
    await settle()

    expect(client.setUser).toHaveBeenCalledWith({ id: '42', email: 'p@example.com' })
    expect(client.initialize).toHaveBeenCalled()
  })
})
