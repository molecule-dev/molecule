/**
 * Tests for Solid.js auth action primitives.
 *
 * @module
 */

import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../context.js', () => ({
  getAuthClient: vi.fn(),
}))

import { getAuthClient } from '../../context.js'
import { createChangePassword } from '../change-password.js'
import { createLogin } from '../login.js'
import { createOAuth } from '../oauth.js'
import { createPasswordReset } from '../password-reset.js'
import { createSignup } from '../signup.js'

const mockClient = {
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
  subscribe: vi.fn(),
  onAuthChange: vi.fn(),
  addEventListener: vi.fn(),
  destroy: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthClient).mockReturnValue(
    mockClient as unknown as ReturnType<typeof getAuthClient>,
  )
})

describe('createLogin', () => {
  it('has idle initial state', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state } = createLogin()

        expect(state()).toEqual({
          status: 'idle',
          value: null,
          error: null,
        })

        dispose()
        resolve()
      })
    })
  })

  it('transitions through pending to resolved on success', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const authResult = {
          user: { id: '1', email: 'test@example.com' },
          accessToken: 'token-123',
        }
        mockClient.login.mockResolvedValue(authResult)

        const { state, login } = createLogin()

        const promise = login({ email: 'test@example.com', password: 'pass' })

        expect(state().status).toBe('pending')
        expect(state().value).toBeNull()

        const result = await promise

        expect(result).toEqual(authResult)
        expect(state().status).toBe('resolved')
        expect(state().value).toEqual(authResult)
        expect(state().error).toBeNull()
        expect(mockClient.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'pass',
        })

        dispose()
        resolve()
      })
    })
  })

  it('transitions through pending to rejected on error', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const error = new Error('Invalid credentials')
        mockClient.login.mockRejectedValue(error)

        const { state, login } = createLogin()

        const promise = login({ email: 'bad@example.com', password: 'wrong' })

        expect(state().status).toBe('pending')

        try {
          await promise
        } catch {
          // expected
        }

        expect(state().status).toBe('rejected')
        expect(state().value).toBeNull()
        expect(state().error).toBe(error)

        dispose()
        resolve()
      })
    })
  })

  it('reset clears state back to idle', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const authResult = { user: { id: '1' }, accessToken: 'tok' }
        mockClient.login.mockResolvedValue(authResult)

        const { state, login, reset } = createLogin()

        await login({ email: 'a@b.com', password: 'p' })
        expect(state().status).toBe('resolved')

        reset()

        expect(state()).toEqual({
          status: 'idle',
          value: null,
          error: null,
        })

        dispose()
        resolve()
      })
    })
  })
})

describe('createSignup', () => {
  it('transitions through pending to resolved on success', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const authResult = {
          user: { id: '2', email: 'new@example.com' },
          accessToken: 'token-456',
        }
        mockClient.register.mockResolvedValue(authResult)

        const { state, signup } = createSignup()

        const promise = signup({
          email: 'new@example.com',
          password: 'pass123',
          name: 'New User',
        })

        expect(state().status).toBe('pending')

        const result = await promise

        expect(result).toEqual(authResult)
        expect(state().status).toBe('resolved')
        expect(state().value).toEqual(authResult)
        expect(mockClient.register).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'pass123',
          name: 'New User',
        })

        dispose()
        resolve()
      })
    })
  })

  it('handles rejection', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const error = new Error('Email already taken')
        mockClient.register.mockRejectedValue(error)

        const { state, signup } = createSignup()

        try {
          await signup({ email: 'taken@example.com', password: 'pass' })
        } catch {
          // expected
        }

        expect(state().status).toBe('rejected')
        expect(state().error).toBe(error)

        dispose()
        resolve()
      })
    })
  })
})

describe('createChangePassword', () => {
  it('tracks status through lifecycle', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockClient.changePassword.mockResolvedValue(undefined)

        const { state, changePassword } = createChangePassword()

        expect(state().status).toBe('idle')

        const promise = changePassword('oldPass', 'newPass')

        expect(state().status).toBe('pending')

        await promise

        expect(state().status).toBe('resolved')
        expect(state().error).toBeNull()
        expect(mockClient.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')

        dispose()
        resolve()
      })
    })
  })

  it('handles rejection', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const error = new Error('Incorrect current password')
        mockClient.changePassword.mockRejectedValue(error)

        const { state, changePassword } = createChangePassword()

        try {
          await changePassword('wrong', 'newPass')
        } catch {
          // expected
        }

        expect(state().status).toBe('rejected')
        expect(state().error).toBe(error)

        dispose()
        resolve()
      })
    })
  })
})

describe('createPasswordReset', () => {
  it('tracks request and confirm separately', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockClient.requestPasswordReset.mockResolvedValue(undefined)
        mockClient.confirmPasswordReset.mockResolvedValue(undefined)

        const { requestState, confirmState, requestReset, confirmReset } = createPasswordReset()

        expect(requestState().status).toBe('idle')
        expect(confirmState().status).toBe('idle')

        // Request phase
        const reqPromise = requestReset({ email: 'user@example.com' })
        expect(requestState().status).toBe('pending')
        expect(confirmState().status).toBe('idle')

        await reqPromise

        expect(requestState().status).toBe('resolved')
        expect(confirmState().status).toBe('idle')
        expect(mockClient.requestPasswordReset).toHaveBeenCalledWith({
          email: 'user@example.com',
        })

        // Confirm phase
        const confPromise = confirmReset({ token: 'reset-token', password: 'newPass' })
        expect(confirmState().status).toBe('pending')
        expect(requestState().status).toBe('resolved')

        await confPromise

        expect(confirmState().status).toBe('resolved')
        expect(mockClient.confirmPasswordReset).toHaveBeenCalledWith({
          token: 'reset-token',
          password: 'newPass',
        })

        dispose()
        resolve()
      })
    })
  })

  it('reset clears both request and confirm state', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        mockClient.requestPasswordReset.mockResolvedValue(undefined)
        mockClient.confirmPasswordReset.mockResolvedValue(undefined)

        const { requestState, confirmState, requestReset, confirmReset, reset } =
          createPasswordReset()

        await requestReset({ email: 'user@example.com' })
        await confirmReset({ token: 'tok', password: 'pw' })

        expect(requestState().status).toBe('resolved')
        expect(confirmState().status).toBe('resolved')

        reset()

        expect(requestState()).toEqual({
          status: 'idle',
          value: null,
          error: null,
        })
        expect(confirmState()).toEqual({
          status: 'idle',
          value: null,
          error: null,
        })

        dispose()
        resolve()
      })
    })
  })
})

describe('createOAuth', () => {
  it('returns providers from config', () => {
    const { providers } = createOAuth({
      oauthProviders: ['github', 'google', 'twitter'],
    })

    expect(providers()).toEqual(['github', 'google', 'twitter'])
  })

  it('getOAuthUrl builds correct URL', () => {
    const { getOAuthUrl } = createOAuth({
      baseURL: 'https://api.example.com',
      oauthEndpoint: '/auth/oauth',
      oauthProviders: ['github'],
    })

    expect(getOAuthUrl('github')).toBe('https://api.example.com/auth/oauth/github')
    expect(getOAuthUrl('google')).toBe('https://api.example.com/auth/oauth/google')
  })
})
