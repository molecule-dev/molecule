import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createChangePasswordState } from '../change-password.service.js'
import { createLoginState } from '../login.service.js'
import { createOAuthState } from '../oauth.service.js'
import { createPasswordResetState } from '../password-reset.service.js'
import { createSignupState } from '../signup.service.js'

const mockClient = {
  login: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  getState: vi.fn(() => ({
    initialized: false,
    authenticated: false,
    user: null,
    loading: false,
    error: null,
  })),
  isAuthenticated: vi.fn(() => false),
  getUser: vi.fn(() => null),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  updateProfile: vi.fn(),
  initialize: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  onAuthChange: vi.fn(() => () => {}),
  addEventListener: vi.fn(() => () => {}),
  destroy: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createLoginState', () => {
  it('initial state is idle', () => {
    const manager = createLoginState(mockClient)

    expect(manager.getState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })

    manager.destroy()
  })

  it('call transitions through pending to resolved', async () => {
    const authResult = { user: { id: '1', email: 'a@b.com' }, accessToken: 'tok' }
    mockClient.login.mockResolvedValue(authResult)

    const manager = createLoginState(mockClient)
    const states: Array<{ status: string }> = []

    manager.state$.subscribe((s) => states.push({ ...s }))

    const result = await manager.login({ email: 'a@b.com', password: 'secret' })

    expect(result).toEqual(authResult)
    expect(mockClient.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' })
    expect(manager.getState()).toEqual({
      status: 'resolved',
      value: authResult,
      error: null,
    })
    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])

    manager.destroy()
  })

  it('call handles rejection', async () => {
    const error = new Error('Invalid credentials')
    mockClient.login.mockRejectedValue(error)

    const manager = createLoginState(mockClient)
    const states: Array<{ status: string }> = []

    manager.state$.subscribe((s) => states.push({ ...s }))

    await expect(manager.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    )

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error,
    })
    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'rejected'])

    manager.destroy()
  })

  it('reset clears state', async () => {
    const authResult = { user: { id: '1' }, accessToken: 'tok' }
    mockClient.login.mockResolvedValue(authResult)

    const manager = createLoginState(mockClient)

    await manager.login({ email: 'a@b.com', password: 'secret' })
    expect(manager.getState().status).toBe('resolved')

    manager.reset()

    expect(manager.getState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })

    manager.destroy()
  })
})

describe('createSignupState', () => {
  it('call transitions through pending to resolved', async () => {
    const authResult = { user: { id: '1', email: 'a@b.com' }, accessToken: 'tok' }
    mockClient.register.mockResolvedValue(authResult)

    const manager = createSignupState(mockClient)
    const states: Array<{ status: string }> = []

    manager.state$.subscribe((s) => states.push({ ...s }))

    const result = await manager.signup({ email: 'a@b.com', password: 'secret' })

    expect(result).toEqual(authResult)
    expect(mockClient.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    })
    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])

    manager.destroy()
  })

  it('handles rejection', async () => {
    const error = new Error('Email taken')
    mockClient.register.mockRejectedValue(error)

    const manager = createSignupState(mockClient)

    await expect(manager.signup({ email: 'a@b.com', password: 'secret' })).rejects.toThrow(
      'Email taken',
    )

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error,
    })

    manager.destroy()
  })
})

describe('createChangePasswordState', () => {
  it('tracks status through lifecycle', async () => {
    mockClient.changePassword.mockResolvedValue(undefined)

    const manager = createChangePasswordState(mockClient)
    const states: Array<{ status: string }> = []

    manager.state$.subscribe((s) => states.push({ ...s }))

    await manager.changePassword('old', 'new')

    expect(mockClient.changePassword).toHaveBeenCalledWith('old', 'new')
    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])

    manager.destroy()
  })

  it('handles rejection', async () => {
    const error = new Error('Wrong password')
    mockClient.changePassword.mockRejectedValue(error)

    const manager = createChangePasswordState(mockClient)

    await expect(manager.changePassword('old', 'new')).rejects.toThrow('Wrong password')

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error,
    })

    manager.destroy()
  })
})

describe('createPasswordResetState', () => {
  it('tracks request and confirm separately', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    const manager = createPasswordResetState(mockClient)
    const requestStates: Array<{ status: string }> = []
    const confirmStates: Array<{ status: string }> = []

    manager.requestState$.subscribe((s) => requestStates.push({ ...s }))
    manager.confirmState$.subscribe((s) => confirmStates.push({ ...s }))

    await manager.requestReset({ email: 'a@b.com' })

    expect(mockClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'a@b.com' })
    expect(requestStates.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])
    expect(confirmStates.map((s) => s.status)).toEqual(['idle'])

    await manager.confirmReset({ token: 'abc', password: 'newpass' })

    expect(mockClient.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'abc',
      password: 'newpass',
    })
    expect(confirmStates.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])

    manager.destroy()
  })

  it('reset clears both', async () => {
    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    const manager = createPasswordResetState(mockClient)

    await manager.requestReset({ email: 'a@b.com' })
    await manager.confirmReset({ token: 'abc', password: 'newpass' })

    expect(manager.getRequestState().status).toBe('resolved')
    expect(manager.getConfirmState().status).toBe('resolved')

    manager.reset()

    expect(manager.getRequestState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })
    expect(manager.getConfirmState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })

    manager.destroy()
  })
})

describe('createOAuthState', () => {
  it('returns providers', () => {
    const manager = createOAuthState({
      oauthProviders: ['github', 'google'],
    })

    const providers: string[][] = []
    manager.providers$.subscribe((p) => providers.push(p))

    expect(manager.getProviders()).toEqual(['github', 'google'])
    expect(providers).toEqual([['github', 'google']])

    manager.destroy()
  })

  it('getOAuthUrl builds correct URL', () => {
    const manager = createOAuthState({
      baseURL: 'https://api.example.com',
      oauthEndpoint: '/auth/oauth',
      oauthProviders: ['github'],
    })

    expect(manager.getOAuthUrl('github')).toBe('https://api.example.com/auth/oauth/github')

    manager.destroy()
  })
})
