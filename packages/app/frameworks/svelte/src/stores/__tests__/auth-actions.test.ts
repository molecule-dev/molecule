// @vitest-environment jsdom

import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../context.js', () => ({
  getAuthClient: vi.fn(),
}))

import { getAuthClient } from '../../context.js'
import { createChangePasswordStore } from '../change-password.js'
import { createLoginStore } from '../login.js'
import { createOAuthHelpers } from '../oauth.js'
import { createPasswordResetStores } from '../password-reset.js'
import { createSignupStore } from '../signup.js'

const mockGetAuthClient = getAuthClient as ReturnType<typeof vi.fn>

function createMockClient() {
  return {
    login: vi.fn(),
    register: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getState: vi.fn(),
    isAuthenticated: vi.fn(),
    getUser: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    updateProfile: vi.fn(),
    initialize: vi.fn(),
    onAuthChange: vi.fn(),
    setAccessToken: vi.fn(),
    setUser: vi.fn(),
  }
}

let mockClient: ReturnType<typeof createMockClient>

beforeEach(() => {
  vi.clearAllMocks()
  mockClient = createMockClient()
  mockGetAuthClient.mockReturnValue(mockClient)
})

describe('createLoginStore', () => {
  it('should have idle initial state', () => {
    const store = createLoginStore()
    const state = get(store)

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should transition through pending to resolved on successful call', async () => {
    const result = { user: { id: '1', name: 'Test' }, accessToken: 'tok' }
    mockClient.login.mockResolvedValue(result)

    const store = createLoginStore()
    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    const value = await store.call({ email: 'a@b.com', password: 'pass' })

    expect(value).toEqual(result)
    expect(mockClient.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })
    expect(states).toEqual(['idle', 'pending', 'resolved'])
    expect(get(store).value).toEqual(result)
  })

  it('should transition through pending to rejected on failed call', async () => {
    const error = new Error('Invalid credentials')
    mockClient.login.mockRejectedValue(error)

    const store = createLoginStore()
    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    await expect(store.call({ email: 'a@b.com', password: 'bad' })).rejects.toThrow(
      'Invalid credentials',
    )

    expect(states).toEqual(['idle', 'pending', 'rejected'])
    expect(get(store).error).toBe(error)
  })

  it('should reset to idle state', async () => {
    mockClient.login.mockResolvedValue({ user: { id: '1' } })

    const store = createLoginStore()
    await store.call({ email: 'a@b.com', password: 'pass' })
    expect(get(store).status).toBe('resolved')

    store.reset()

    const state = get(store)
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })
})

describe('createSignupStore', () => {
  it('should transition through pending to resolved on successful call', async () => {
    const result = { user: { id: '2', name: 'New User' }, accessToken: 'tok2' }
    mockClient.register.mockResolvedValue(result)

    const store = createSignupStore()
    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    const value = await store.call({ email: 'new@b.com', password: 'pass', name: 'New User' })

    expect(value).toEqual(result)
    expect(mockClient.register).toHaveBeenCalledWith({
      email: 'new@b.com',
      password: 'pass',
      name: 'New User',
    })
    expect(states).toEqual(['idle', 'pending', 'resolved'])
  })

  it('should handle rejection', async () => {
    const error = new Error('Email taken')
    mockClient.register.mockRejectedValue(error)

    const store = createSignupStore()

    await expect(store.call({ email: 'taken@b.com', password: 'pass' })).rejects.toThrow(
      'Email taken',
    )

    expect(get(store).status).toBe('rejected')
    expect(get(store).error).toBe(error)
  })
})

describe('createChangePasswordStore', () => {
  it('should track status through lifecycle', async () => {
    mockClient.changePassword.mockResolvedValue(undefined)

    const store = createChangePasswordStore()
    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    await store.call('oldPass', 'newPass')

    expect(mockClient.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
    expect(states).toEqual(['idle', 'pending', 'resolved'])
  })

  it('should handle rejection', async () => {
    const error = new Error('Wrong password')
    mockClient.changePassword.mockRejectedValue(error)

    const store = createChangePasswordStore()

    await expect(store.call('wrong', 'new')).rejects.toThrow('Wrong password')

    expect(get(store).status).toBe('rejected')
    expect(get(store).error).toBe(error)
  })
})

describe('createPasswordResetStores', () => {
  it('should track request and confirm separately', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    const { request, confirm } = createPasswordResetStores()

    const requestStates: string[] = []
    const confirmStates: string[] = []
    request.subscribe((s) => requestStates.push(s.status))
    confirm.subscribe((s) => confirmStates.push(s.status))

    await request.call({ email: 'a@b.com' })

    expect(mockClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'a@b.com' })
    expect(requestStates).toEqual(['idle', 'pending', 'resolved'])
    expect(confirmStates).toEqual(['idle'])

    await confirm.call({ token: 'tok', password: 'newPass' })

    expect(mockClient.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'tok',
      password: 'newPass',
    })
    expect(confirmStates).toEqual(['idle', 'pending', 'resolved'])
  })

  it('should resetAll to clear both stores', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    const { request, confirm, resetAll } = createPasswordResetStores()

    await request.call({ email: 'a@b.com' })
    await confirm.call({ token: 'tok', password: 'newPass' })

    expect(get(request).status).toBe('resolved')
    expect(get(confirm).status).toBe('resolved')

    resetAll()

    expect(get(request).status).toBe('idle')
    expect(get(confirm).status).toBe('idle')
  })
})

describe('createOAuthHelpers', () => {
  it('should return providers as a readable store', () => {
    const { providers } = createOAuthHelpers({ oauthProviders: ['google', 'github'] })

    expect(get(providers)).toEqual(['google', 'github'])
  })

  it('should build correct OAuth URL', () => {
    const { getOAuthUrl } = createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthEndpoint: '/auth/oauth',
    })

    expect(getOAuthUrl('google')).toBe('https://api.example.com/auth/oauth/google')
  })
})

// The cases below carry React's `useAuthActions.test.tsx` titles character for
// character, expressed through this package's stores instead of React's hooks.

describe('useLogin', () => {
  it('should start in idle state', () => {
    const store = createLoginStore()
    const state = get(store)

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful login', async () => {
    mockClient.login.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'mock-token',
      expiresAt: Date.now() + 3600000,
    })
    const store = createLoginStore()

    expect(get(store).status).toBe('idle')

    const value = await store.call({ email: 'test@example.com', password: 'password' })

    expect(get(store).status).toBe('resolved')
    expect(get(store).value).toBeTruthy()
    expect(value.user).toEqual({ id: '1', email: 'test@example.com' })
    expect(get(store).error).toBeNull()
    expect(mockClient.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('should transition idle -> pending -> rejected on failed login', async () => {
    mockClient.login.mockRejectedValue(new Error('Invalid credentials'))
    const store = createLoginStore()

    expect(get(store).status).toBe('idle')

    await expect(store.call({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    )

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error?.message).toBe('Invalid credentials')
    expect(state.value).toBeNull()
  })

  it('should reset state to idle', async () => {
    mockClient.login.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } })
    const store = createLoginStore()

    await store.call({ email: 'test@example.com', password: 'password' })
    expect(get(store).status).toBe('resolved')

    store.reset()

    const state = get(store)
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })
})

describe('useSignup', () => {
  it('should start in idle state', () => {
    const store = createSignupStore()
    const state = get(store)

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful signup', async () => {
    mockClient.register.mockResolvedValue({
      user: { id: '2', email: 'new@example.com' },
      accessToken: 'mock-token',
      expiresAt: Date.now() + 3600000,
    })
    const store = createSignupStore()

    const value = await store.call({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })

    expect(get(store).status).toBe('resolved')
    expect(get(store).value).toBeTruthy()
    expect(value.user).toEqual({ id: '2', email: 'new@example.com' })
    expect(get(store).error).toBeNull()
    expect(mockClient.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })
  })

  it('should transition idle -> pending -> rejected on failed signup', async () => {
    mockClient.register.mockRejectedValue(new Error('Email already exists'))
    const store = createSignupStore()

    await expect(
      store.call({ email: 'existing@example.com', password: 'password' }),
    ).rejects.toThrow('Email already exists')

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error?.message).toBe('Email already exists')
  })
})

describe('useChangePassword', () => {
  it('should start in idle state', () => {
    const store = createChangePasswordStore()
    const state = get(store)

    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful change', async () => {
    mockClient.changePassword.mockResolvedValue(undefined)
    const store = createChangePasswordStore()

    await store.call('oldPass', 'newPass')

    expect(get(store).status).toBe('resolved')
    expect(get(store).error).toBeNull()
    expect(mockClient.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
  })

  it('should transition idle -> pending -> rejected on failed change', async () => {
    mockClient.changePassword.mockRejectedValue(new Error('Incorrect old password'))
    const store = createChangePasswordStore()

    await expect(store.call('wrongOld', 'newPass')).rejects.toThrow('Incorrect old password')

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error?.message).toBe('Incorrect old password')
  })
})

describe('usePasswordReset', () => {
  it('should start with both states idle', () => {
    const { request, confirm } = createPasswordResetStores()

    expect(get(request).status).toBe('idle')
    expect(get(request).error).toBeNull()
    expect(get(confirm).status).toBe('idle')
    expect(get(confirm).error).toBeNull()
  })

  it('should track request and confirm steps independently', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)
    const { request, confirm } = createPasswordResetStores()

    // Request step
    await request.call({ email: 'test@example.com' })

    expect(get(request).status).toBe('resolved')
    expect(get(confirm).status).toBe('idle')
    expect(mockClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@example.com' })

    // Confirm step
    await confirm.call({ token: 'reset-token', password: 'newPassword' })

    expect(get(request).status).toBe('resolved')
    expect(get(confirm).status).toBe('resolved')
    expect(mockClient.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'newPassword',
    })
  })

  it('should reset both states', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)
    const { request, confirm, resetAll } = createPasswordResetStores()

    await request.call({ email: 'test@example.com' })
    await confirm.call({ token: 'token', password: 'pass' })

    expect(get(request).status).toBe('resolved')
    expect(get(confirm).status).toBe('resolved')

    resetAll()

    expect(get(request).status).toBe('idle')
    expect(get(request).error).toBeNull()
    expect(get(confirm).status).toBe('idle')
    expect(get(confirm).error).toBeNull()
  })
})

describe('useOAuth', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
    sessionStorage.clear()
  })

  it('should return providers from config', () => {
    const { providers } = createOAuthHelpers({ oauthProviders: ['github', 'google', 'gitlab'] })

    expect(get(providers)).toEqual(['github', 'google', 'gitlab'])
  })

  it('should return empty providers when none configured', () => {
    const { providers } = createOAuthHelpers()

    expect(get(providers)).toEqual([])
  })

  it('should use default oauth endpoint', () => {
    const { getOAuthUrl } = createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['google'],
    })

    expect(getOAuthUrl('google')).toBe('https://api.example.com/oauth/google')
  })

  it('should redirect to provider URL', () => {
    const { redirect } = createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
    })

    redirect('github')

    expect(window.location.href).toBe('https://api.example.com/oauth/github')
  })

  it('should store oauth_provider in sessionStorage on redirect', () => {
    const { redirect } = createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
    })

    redirect('github')

    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })
})

describe('useOAuth callback detection', () => {
  const originalLocation = window.location
  let replaceStateSpy: ReturnType<typeof vi.spyOn>
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
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
    // Reset location back to a clean state
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
  })

  /**
   * Sets window.location to a URL with the given search params.
   * @param search - Query string including leading '?'.
   */
  function setLocationWithSearch(search: string): void {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL(`http://localhost${search}`),
    })
  }

  it('should detect callback when URL has code and state params', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })

    // Wait for the async exchangeCode to fire
    await new Promise((r) => setTimeout(r, 10))

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

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    await new Promise((r) => setTimeout(r, 10))

    // Token goes to the in-memory adapter via the client, never to localStorage.
    expect(mockClient.setAccessToken).toHaveBeenCalledWith('the-token-123')
    expect(setItemSpy).not.toHaveBeenCalledWith('molecule:auth:accessToken', expect.anything())
    setItemSpy.mockRestore()
  })

  it('should clean URL after processing callback', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })

    await new Promise((r) => setTimeout(r, 10))

    expect(replaceStateSpy).toHaveBeenCalled()
    const cleanedUrl = String(replaceStateSpy.mock.calls[0][2])
    expect(cleanedUrl).not.toContain('code=')
    expect(cleanedUrl).not.toContain('state=')
  })

  it('should not process callback when sessionStorage has no oauth_provider', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    // Intentionally NOT setting sessionStorage oauth_provider

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })

    await new Promise((r) => setTimeout(r, 10))

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

    createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
      onError,
    })

    await new Promise((r) => setTimeout(r, 10))

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

    createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
      onSuccess,
    })

    await new Promise((r) => setTimeout(r, 10))

    expect(onSuccess).toHaveBeenCalled()
  })

  it('should handle network errors gracefully in code exchange', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    const onError = vi.fn()

    createOAuthHelpers({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
      onError,
    })

    await new Promise((r) => setTimeout(r, 10))

    expect(onError).toHaveBeenCalledWith('Network error')
  })

  it('should remove oauth_provider from sessionStorage after processing', async () => {
    setLocationWithSearch('?code=abc123&state=xyz789')
    sessionStorage.setItem('oauth_provider', 'github')

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })

    await new Promise((r) => setTimeout(r, 10))

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

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    await new Promise((r) => setTimeout(r, 10))

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok-7')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: '7', email: 'gh@example.com' })
    expect(mockClient.initialize).toHaveBeenCalled()
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

    createOAuthHelpers({ baseURL: 'https://api.example.com', oauthProviders: ['github'] })
    await new Promise((r) => setTimeout(r, 10))

    expect(mockClient.setUser).toHaveBeenCalledWith({ id: '42', email: 'p@example.com' })
    expect(mockClient.initialize).toHaveBeenCalled()
  })
})
