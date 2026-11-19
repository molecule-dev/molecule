// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'

import { useChangePassword } from '../composables/useChangePassword.js'
import { useLogin } from '../composables/useLogin.js'
import { useOAuth } from '../composables/useOAuth.js'
import { usePasswordReset } from '../composables/usePasswordReset.js'
import { useSignup } from '../composables/useSignup.js'
import { createAuthPlugin } from '../plugin.js'

/** The app user the mock client carries. */
type User = { id: string; email: string }

/**
 * Creates a mock auth client with configurable behavior.
 *
 * @returns A mock AuthClient instance for testing.
 */
const createMockAuthClient = (): AuthClient<User> => {
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

const wrappers: VueWrapper[] = []

/**
 * Mounts a component that runs `composable` in setup and returns its result.
 *
 * @param composable - The composable to run.
 * @param client - The auth client to provide, when the composable injects one.
 * @returns The composable's result with the mounted wrapper.
 */
const mountComposable = <T>(
  composable: () => T,
  client?: AuthClient<User>,
): { result: T; wrapper: VueWrapper } => {
  let result!: T
  const Harness = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  const wrapper = mount(Harness, {
    global: { plugins: client ? [createAuthPlugin(client)] : [] },
  })
  wrappers.push(wrapper)
  return { result, wrapper }
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('useLogin', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = mountComposable(() => useLogin(), client)

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful login', async () => {
    const { result } = mountComposable(() => useLogin(), client)

    expect(result.status.value).toBe('idle')

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toBeTruthy()
    expect(result.value.value!.user).toEqual({ id: '1', email: 'test@example.com' })
    expect(result.error.value).toBeNull()
    expect(client.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' })
  })

  it('should transition idle -> pending -> rejected on failed login', async () => {
    client.login = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    const { result } = mountComposable(() => useLogin(), client)

    expect(result.status.value).toBe('idle')

    try {
      await result.login({ email: 'test@example.com', password: 'wrong' })
    } catch (_error) {
      // Expected rejection — the composable captures the error in result.error
    }

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('Invalid credentials')
    expect(result.value.value).toBeNull()
  })

  it('should reset state to idle', async () => {
    const { result } = mountComposable(() => useLogin(), client)

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(result.status.value).toBe('resolved')

    result.reset()

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()
  })
})

describe('useSignup', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = mountComposable(() => useSignup(), client)

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful signup', async () => {
    const { result } = mountComposable(() => useSignup(), client)

    await result.signup({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toBeTruthy()
    expect(result.value.value!.user).toEqual({ id: '2', email: 'new@example.com' })
    expect(result.error.value).toBeNull()
    expect(client.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })
  })

  it('should transition idle -> pending -> rejected on failed signup', async () => {
    client.register = vi.fn().mockRejectedValue(new Error('Email already exists'))

    const { result } = mountComposable(() => useSignup(), client)

    try {
      await result.signup({ email: 'existing@example.com', password: 'password' })
    } catch (_error) {
      // Expected rejection — the composable captures the error in result.error
    }

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('Email already exists')
  })
})

describe('useChangePassword', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = mountComposable(() => useChangePassword(), client)

    expect(result.status.value).toBe('idle')
    expect(result.error.value).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful change', async () => {
    const { result } = mountComposable(() => useChangePassword(), client)

    await result.changePassword('oldPass', 'newPass')

    expect(result.status.value).toBe('resolved')
    expect(result.error.value).toBeNull()
    expect(client.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
  })

  it('should transition idle -> pending -> rejected on failed change', async () => {
    client.changePassword = vi.fn().mockRejectedValue(new Error('Incorrect old password'))

    const { result } = mountComposable(() => useChangePassword(), client)

    try {
      await result.changePassword('wrongOld', 'newPass')
    } catch (_error) {
      // Expected rejection — the composable captures the error in result.error
    }

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('Incorrect old password')
  })
})

describe('usePasswordReset', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start with both states idle', () => {
    const { result } = mountComposable(() => usePasswordReset(), client)

    expect(result.requestStatus.value).toBe('idle')
    expect(result.requestError.value).toBeNull()
    expect(result.confirmStatus.value).toBe('idle')
    expect(result.confirmError.value).toBeNull()
  })

  it('should track request and confirm steps independently', async () => {
    const { result } = mountComposable(() => usePasswordReset(), client)

    // Request step
    await result.requestReset({ email: 'test@example.com' })

    expect(result.requestStatus.value).toBe('resolved')
    expect(result.confirmStatus.value).toBe('idle')
    expect(client.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@example.com' })

    // Confirm step
    await result.confirmReset({ token: 'reset-token', password: 'newPassword' })

    expect(result.requestStatus.value).toBe('resolved')
    expect(result.confirmStatus.value).toBe('resolved')
    expect(client.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'newPassword',
    })
  })

  it('should reset both states', async () => {
    const { result } = mountComposable(() => usePasswordReset(), client)

    await result.requestReset({ email: 'test@example.com' })
    await result.confirmReset({ token: 'token', password: 'pass' })

    expect(result.requestStatus.value).toBe('resolved')
    expect(result.confirmStatus.value).toBe('resolved')

    result.reset()

    expect(result.requestStatus.value).toBe('idle')
    expect(result.requestError.value).toBeNull()
    expect(result.confirmStatus.value).toBe('idle')
    expect(result.confirmError.value).toBeNull()
  })
})

describe('useOAuth', () => {
  let client: ReturnType<typeof createMockAuthClient>
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
    const { result } = mountComposable(
      () => useOAuth({ oauthProviders: ['github', 'google', 'gitlab'] }),
      client,
    )

    expect(result.providers.value).toEqual(['github', 'google', 'gitlab'])
  })

  it('should return empty providers when none configured', () => {
    const { result } = mountComposable(() => useOAuth(), client)

    expect(result.providers.value).toEqual([])
  })

  it('should build correct OAuth URL', () => {
    const { result } = mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
          oauthEndpoint: '/auth/oauth',
        }),
      client,
    )

    expect(result.getOAuthUrl('github')).toBe('https://api.example.com/auth/oauth/github')
  })

  it('should use default oauth endpoint', () => {
    const { result } = mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['google'],
        }),
      client,
    )

    expect(result.getOAuthUrl('google')).toBe('https://api.example.com/oauth/google')
  })

  it('should redirect to provider URL', () => {
    const { result } = mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
    )

    result.redirect('github')

    expect(window.location.href).toBe('https://api.example.com/oauth/github')
  })

  it('should store oauth_provider in sessionStorage on redirect', () => {
    const { result } = mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
    )

    result.redirect('github')

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
    sessionStorage.clear()
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
  const setLocationWithSearch = (search: string): void => {
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
  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  it('should detect callback when URL has code and state params', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
    )

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

    mountComposable(
      () => useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
      client,
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

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
    )

    await settle()

    expect(replaceStateSpy).toHaveBeenCalled()
    const cleanedUrl = String(replaceStateSpy.mock.calls[0][2])
    expect(cleanedUrl).not.toContain('code=')
    expect(cleanedUrl).not.toContain('state=')
  })

  it('should not process callback when sessionStorage has no oauth_provider', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    // Intentionally NOT setting sessionStorage oauth_provider

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
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

    const onError = vi.fn()

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
          onError,
        }),
      client,
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

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
          onSuccess,
        }),
      client,
    )

    await settle()

    expect(onSuccess).toHaveBeenCalled()
  })

  it('should handle network errors gracefully in code exchange', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const onError = vi.fn()

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
          onError,
        }),
      client,
    )

    await settle()

    expect(onError).toHaveBeenCalledWith('Network error')
  })

  it('should remove oauth_provider from sessionStorage after processing', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    mountComposable(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      client,
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

    mountComposable(
      () => useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
      client,
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

    mountComposable(
      () => useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'] }),
      client,
    )
    await settle()

    expect(client.setUser).toHaveBeenCalledWith({ id: '42', email: 'p@example.com' })
    expect(client.initialize).toHaveBeenCalled()
  })
})
