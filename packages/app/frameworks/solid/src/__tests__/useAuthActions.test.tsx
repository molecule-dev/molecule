// @vitest-environment jsdom

/**
 * The Solid counterparts of React's `useAuthActions.test.tsx`: the auth action
 * primitives (`useLogin`, `useSignup`, `useChangePassword`, `usePasswordReset`,
 * `useOAuth`) state for state, under the same titles.
 *
 * Solid primitives are created inside a component and read through accessors,
 * so a React `renderHook` case becomes a mounted probe whose result is captured;
 * every other input and expectation is the same.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthSessionSeed, AuthState } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useChangePassword } from '../primitives/change-password.js'
import { useLogin } from '../primitives/login.js'
import { useOAuth } from '../primitives/oauth-react.js'
import { usePasswordReset } from '../primitives/password-reset.js'
import { useSignup } from '../primitives/signup.js'

/** The profile the mock API returns. */
interface AuthUser {
  id: string
  email: string
}

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Mounts a probe that creates one auth primitive under its context provider.
 *
 * @param client - The auth client to provide.
 * @param use - Creates the primitive inside the probe's setup.
 * @returns The primitive the probe created.
 */
function renderPrimitive<R>(client: AuthClient<AuthUser>, use: () => R): { readonly current: R } {
  let captured: R | undefined
  function Probe(): JSX.Element {
    captured = use()
    return <></>
  }
  mount(() => (
    <AuthContext.Provider value={client}>
      <Probe />
    </AuthContext.Provider>
  ))
  return {
    get current(): R {
      if (captured === undefined) throw new Error('the probe did not create the primitive')
      return captured
    },
  }
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Creates a mock auth client with configurable behavior.
 *
 * @returns A mock AuthClient instance for testing.
 */
function createMockAuthClient(): AuthClient<AuthUser> {
  let currentUser: AuthUser | null = null
  let authenticated = false
  const listeners = new Set<() => void>()

  const getState = (): AuthState<AuthUser> => ({
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
    setAccessToken: vi.fn(),
    setSession: vi.fn().mockImplementation((session: AuthSessionSeed<AuthUser>) => {
      currentUser = session.user
      authenticated = session.user !== null
      listeners.forEach((listener) => listener())
    }),
    setUser: vi.fn().mockImplementation((user: AuthUser | null) => {
      currentUser = user
    }),
    getRefreshToken: () => (authenticated ? 'mock-refresh-token' : null),
    login: vi.fn().mockImplementation(async () => {
      currentUser = { id: '1', email: 'test@example.com' }
      authenticated = true
      listeners.forEach((listener) => listener())
      return {
        user: currentUser,
        accessToken: 'mock-token',
        expiresAt: Date.now() + 3600000,
      }
    }),
    logout: vi.fn().mockImplementation(async () => {
      currentUser = null
      authenticated = false
      listeners.forEach((listener) => listener())
    }),
    register: vi.fn().mockImplementation(async () => {
      currentUser = { id: '2', email: 'new@example.com' }
      authenticated = true
      listeners.forEach((listener) => listener())
      return {
        user: currentUser,
        accessToken: 'mock-token',
        expiresAt: Date.now() + 3600000,
      }
    }),
    refresh: vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'refreshed-token',
    }),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn(),
    changePassword: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    subscribe: (callback) => {
      listeners.add(() => callback(getState()))
      return () => listeners.clear()
    },
    onAuthChange: (callback) => {
      listeners.add(() => callback(getState()))
      return () => listeners.clear()
    },
    addEventListener: vi.fn().mockReturnValue(() => {}),
    destroy: vi.fn(),
  }
}

// The redirect stores `oauth_provider` in session storage. Clear it after every test, or a
// callback test that expects none reads the value an earlier test left.
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  sessionStorage.clear()
})

describe('useLogin', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const result = renderPrimitive(client, () => useLogin<AuthUser>())

    expect(result.current.status()).toBe('idle')
    expect(result.current.value()).toBeNull()
    expect(result.current.error()).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful login', async () => {
    const result = renderPrimitive(client, () => useLogin<AuthUser>())

    expect(result.current.status()).toBe('idle')

    await result.current.login({ email: 'test@example.com', password: 'password' })

    expect(result.current.status()).toBe('resolved')
    expect(result.current.value()).toBeTruthy()
    expect(result.current.value()!.user).toEqual({ id: '1', email: 'test@example.com' })
    expect(result.current.error()).toBeNull()
    expect(client.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' })
  })

  it('should transition idle -> pending -> rejected on failed login', async () => {
    client.login = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    const result = renderPrimitive(client, () => useLogin<AuthUser>())

    expect(result.current.status()).toBe('idle')

    try {
      await result.current.login({ email: 'test@example.com', password: 'wrong' })
    } catch (_error) {
      // Expected rejection — the primitive captures the error in its state.
    }

    expect(result.current.status()).toBe('rejected')
    expect(result.current.error()).toBeInstanceOf(Error)
    expect(result.current.error()!.message).toBe('Invalid credentials')
    expect(result.current.value()).toBeNull()
  })

  it('should reset state to idle', async () => {
    const result = renderPrimitive(client, () => useLogin<AuthUser>())

    await result.current.login({ email: 'test@example.com', password: 'password' })

    expect(result.current.status()).toBe('resolved')

    result.current.reset()

    expect(result.current.status()).toBe('idle')
    expect(result.current.value()).toBeNull()
    expect(result.current.error()).toBeNull()
  })
})

describe('useSignup', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const result = renderPrimitive(client, () => useSignup<AuthUser>())

    expect(result.current.status()).toBe('idle')
    expect(result.current.value()).toBeNull()
    expect(result.current.error()).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful signup', async () => {
    const result = renderPrimitive(client, () => useSignup<AuthUser>())

    await result.current.signup({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })

    expect(result.current.status()).toBe('resolved')
    expect(result.current.value()).toBeTruthy()
    expect(result.current.value()!.user).toEqual({ id: '2', email: 'new@example.com' })
    expect(result.current.error()).toBeNull()
    expect(client.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })
  })

  it('should transition idle -> pending -> rejected on failed signup', async () => {
    client.register = vi.fn().mockRejectedValue(new Error('Email already exists'))

    const result = renderPrimitive(client, () => useSignup<AuthUser>())

    try {
      await result.current.signup({ email: 'existing@example.com', password: 'password' })
    } catch (_error) {
      // Expected rejection — the primitive captures the error in its state.
    }

    expect(result.current.status()).toBe('rejected')
    expect(result.current.error()).toBeInstanceOf(Error)
    expect(result.current.error()!.message).toBe('Email already exists')
  })
})

describe('useChangePassword', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const result = renderPrimitive(client, () => useChangePassword())

    expect(result.current.status()).toBe('idle')
    expect(result.current.error()).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful change', async () => {
    const result = renderPrimitive(client, () => useChangePassword())

    await result.current.changePassword('oldPass', 'newPass')

    expect(result.current.status()).toBe('resolved')
    expect(result.current.error()).toBeNull()
    expect(client.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
  })

  it('should transition idle -> pending -> rejected on failed change', async () => {
    client.changePassword = vi.fn().mockRejectedValue(new Error('Incorrect old password'))

    const result = renderPrimitive(client, () => useChangePassword())

    try {
      await result.current.changePassword('wrongOld', 'newPass')
    } catch (_error) {
      // Expected rejection — the primitive captures the error in its state.
    }

    expect(result.current.status()).toBe('rejected')
    expect(result.current.error()).toBeInstanceOf(Error)
    expect(result.current.error()!.message).toBe('Incorrect old password')
  })
})

describe('usePasswordReset', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start with both states idle', () => {
    const result = renderPrimitive(client, () => usePasswordReset())

    expect(result.current.requestStatus()).toBe('idle')
    expect(result.current.requestError()).toBeNull()
    expect(result.current.confirmStatus()).toBe('idle')
    expect(result.current.confirmError()).toBeNull()
  })

  it('should track request and confirm steps independently', async () => {
    const result = renderPrimitive(client, () => usePasswordReset())

    // Request step
    await result.current.requestReset({ email: 'test@example.com' })

    expect(result.current.requestStatus()).toBe('resolved')
    expect(result.current.confirmStatus()).toBe('idle')
    expect(client.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@example.com' })

    // Confirm step
    await result.current.confirmReset({ token: 'reset-token', password: 'newPassword' })

    expect(result.current.requestStatus()).toBe('resolved')
    expect(result.current.confirmStatus()).toBe('resolved')
    expect(client.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'newPassword',
    })
  })

  it('should reset both states', async () => {
    const result = renderPrimitive(client, () => usePasswordReset())

    await result.current.requestReset({ email: 'test@example.com' })
    await result.current.confirmReset({ token: 'token', password: 'pass' })

    expect(result.current.requestStatus()).toBe('resolved')
    expect(result.current.confirmStatus()).toBe('resolved')

    result.current.reset()

    expect(result.current.requestStatus()).toBe('idle')
    expect(result.current.requestError()).toBeNull()
    expect(result.current.confirmStatus()).toBe('idle')
    expect(result.current.confirmError()).toBeNull()
  })
})

describe('useOAuth', () => {
  let client: ReturnType<typeof createMockAuthClient>
  const originalLocation = window.location

  beforeEach(() => {
    client = createMockAuthClient()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('should return providers from config', () => {
    const result = renderPrimitive(client, () =>
      useOAuth({ oauthProviders: ['github', 'google', 'gitlab'] }),
    )

    expect(result.current.providers).toEqual(['github', 'google', 'gitlab'])
  })

  it('should return empty providers when none configured', () => {
    const result = renderPrimitive(client, () => useOAuth())

    expect(result.current.providers).toEqual([])
  })

  it('should build correct OAuth URL', () => {
    const result = renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        oauthEndpoint: '/auth/oauth',
      }),
    )

    expect(result.current.getOAuthUrl('github')).toBe('https://api.example.com/auth/oauth/github')
  })

  it('should use default oauth endpoint', () => {
    const result = renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['google'],
      }),
    )

    expect(result.current.getOAuthUrl('google')).toBe('https://api.example.com/oauth/google')
  })

  it('should redirect to provider URL', () => {
    const result = renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

    result.current.redirect('github')

    expect(window.location.href).toBe('https://api.example.com/oauth/github')
  })

  it('should store oauth_provider in sessionStorage on redirect', () => {
    const result = renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

    result.current.redirect('github')

    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })
})

describe('useOAuth callback detection', () => {
  let client: ReturnType<typeof createMockAuthClient>
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
      value: new URL(url),
    })
  }

  it('should detect callback when URL has code and state params', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

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

    renderPrimitive(client, () =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
    )
    await settle()

    // Token goes to the in-memory adapter via the client, never to localStorage.
    expect(client.setAccessToken).toHaveBeenCalledWith('the-token-123')
    expect(setItemSpy).not.toHaveBeenCalledWith('molecule:auth:accessToken', expect.anything())
    setItemSpy.mockRestore()
  })

  it('should clean URL after processing callback', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

    await settle()

    expect(replaceStateSpy).toHaveBeenCalled()
    const cleanedUrl = replaceStateSpy.mock.calls[0][2] as string
    expect(cleanedUrl).not.toContain('code=')
    expect(cleanedUrl).not.toContain('state=')
  })

  it('should not process callback when sessionStorage has no oauth_provider', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    // Intentionally NOT setting sessionStorage oauth_provider

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

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

    const onError = vi.fn<(error: string) => void>()

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onError,
      }),
    )

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

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onSuccess,
      }),
    )

    await settle()

    expect(onSuccess).toHaveBeenCalled()
  })

  it('should handle network errors gracefully in code exchange', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const onError = vi.fn()

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
        onError,
      }),
    )

    await settle()

    expect(onError).toHaveBeenCalledWith('Network error')
  })

  it('should remove oauth_provider from sessionStorage after processing', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    renderPrimitive(client, () =>
      useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      }),
    )

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

    renderPrimitive(client, () =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
    )
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

    renderPrimitive(client, () =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
    )
    await settle()

    expect(client.setUser).toHaveBeenCalledWith({ id: '42', email: 'p@example.com' })
    expect(client.initialize).toHaveBeenCalled()
  })
})
