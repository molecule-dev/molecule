import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
