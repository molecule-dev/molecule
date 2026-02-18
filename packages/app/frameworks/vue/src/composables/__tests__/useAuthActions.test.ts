/**
 * Tests for auth action composables (useLogin, useSignup, usePasswordReset,
 * useChangePassword, useOAuth).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

vi.mock('../useAuth.js', () => ({
  useAuthClient: vi.fn(),
}))

import { useAuthClient } from '../useAuth.js'
import { useChangePassword, type UseChangePasswordReturn } from '../useChangePassword.js'
import { useLogin, type UseLoginReturn } from '../useLogin.js'
import { useOAuth, type UseOAuthReturn } from '../useOAuth.js'
import { usePasswordReset, type UsePasswordResetReturn } from '../usePasswordReset.js'
import { useSignup, type UseSignupReturn } from '../useSignup.js'

const createMockClient = (): ReturnType<typeof createMockClient> => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  changePassword: vi.fn(),
  getState: vi.fn(() => ({ user: null, authenticated: false, loading: false })),
  onAuthChange: vi.fn(() => vi.fn()),
})

describe('useLogin', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
    vi.mocked(useAuthClient).mockReturnValue(mockClient as never)
  })

  it('status starts idle, goes to pending on call, resolves', async () => {
    const scope = effectScope()
    let result!: UseLoginReturn

    scope.run(() => {
      result = useLogin()
    })

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()

    const authResult = { user: { id: '1' }, accessToken: 'tok' }
    mockClient.login.mockResolvedValue(authResult)

    const returned = await result.login({ email: 'a@b.com', password: 'pass' })

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toEqual(authResult)
    expect(result.error.value).toBeNull()
    expect(returned).toEqual(authResult)
    expect(mockClient.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })

    scope.stop()
  })

  it('handles rejection', async () => {
    const scope = effectScope()
    let result!: UseLoginReturn

    scope.run(() => {
      result = useLogin()
    })

    const error = new Error('Invalid credentials')
    mockClient.login.mockRejectedValue(error)

    await expect(result.login({ email: 'a@b.com', password: 'bad' })).rejects.toThrow(
      'Invalid credentials',
    )

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBe(error)
    expect(result.value.value).toBeNull()

    scope.stop()
  })

  it('reset clears state', async () => {
    const scope = effectScope()
    let result!: UseLoginReturn

    scope.run(() => {
      result = useLogin()
    })

    const authResult = { user: { id: '1' }, accessToken: 'tok' }
    mockClient.login.mockResolvedValue(authResult)

    await result.login({ email: 'a@b.com', password: 'pass' })
    expect(result.status.value).toBe('resolved')

    result.reset()

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()

    scope.stop()
  })
})

describe('useSignup', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
    vi.mocked(useAuthClient).mockReturnValue(mockClient as never)
  })

  it('status starts idle, goes to pending on call, resolves', async () => {
    const scope = effectScope()
    let result!: UseSignupReturn

    scope.run(() => {
      result = useSignup()
    })

    expect(result.status.value).toBe('idle')

    const authResult = { user: { id: '2' }, accessToken: 'tok2' }
    mockClient.register.mockResolvedValue(authResult)

    const returned = await result.signup({
      email: 'new@b.com',
      password: 'pass',
      name: 'New User',
    })

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toEqual(authResult)
    expect(returned).toEqual(authResult)
    expect(mockClient.register).toHaveBeenCalledWith({
      email: 'new@b.com',
      password: 'pass',
      name: 'New User',
    })

    scope.stop()
  })

  it('handles rejection', async () => {
    const scope = effectScope()
    let result!: UseSignupReturn

    scope.run(() => {
      result = useSignup()
    })

    const error = new Error('Email already taken')
    mockClient.register.mockRejectedValue(error)

    await expect(result.signup({ email: 'dup@b.com', password: 'pass' })).rejects.toThrow(
      'Email already taken',
    )

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBe(error)

    scope.stop()
  })
})

describe('useChangePassword', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
    vi.mocked(useAuthClient).mockReturnValue(mockClient as never)
  })

  it('tracks status through lifecycle', async () => {
    const scope = effectScope()
    let result!: UseChangePasswordReturn
    let resolve!: () => void

    mockClient.changePassword.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )

    scope.run(() => {
      result = useChangePassword()
    })

    expect(result.status.value).toBe('idle')
    expect(result.error.value).toBeNull()

    const promise = result.changePassword('old', 'new')
    expect(result.status.value).toBe('pending')

    resolve()
    await promise

    expect(result.status.value).toBe('resolved')
    expect(result.error.value).toBeNull()
    expect(mockClient.changePassword).toHaveBeenCalledWith('old', 'new')

    scope.stop()
  })

  it('handles rejection', async () => {
    const scope = effectScope()
    let result!: UseChangePasswordReturn

    scope.run(() => {
      result = useChangePassword()
    })

    const error = new Error('Wrong password')
    mockClient.changePassword.mockRejectedValue(error)

    await expect(result.changePassword('wrong', 'new')).rejects.toThrow('Wrong password')

    expect(result.status.value).toBe('rejected')
    expect(result.error.value).toBe(error)

    scope.stop()
  })
})

describe('usePasswordReset', () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
    vi.mocked(useAuthClient).mockReturnValue(mockClient as never)
  })

  it('tracks request and confirm separately', async () => {
    const scope = effectScope()
    let result!: UsePasswordResetReturn

    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    scope.run(() => {
      result = usePasswordReset()
    })

    expect(result.requestStatus.value).toBe('idle')
    expect(result.confirmStatus.value).toBe('idle')

    // Request reset
    await result.requestReset({ email: 'user@b.com' })

    expect(result.requestStatus.value).toBe('resolved')
    expect(result.requestError.value).toBeNull()
    expect(result.confirmStatus.value).toBe('idle')
    expect(mockClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@b.com' })

    // Confirm reset
    await result.confirmReset({ token: 'tok', password: 'newpass' })

    expect(result.confirmStatus.value).toBe('resolved')
    expect(result.confirmError.value).toBeNull()
    expect(mockClient.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'tok',
      password: 'newpass',
    })

    scope.stop()
  })

  it('reset clears both', async () => {
    const scope = effectScope()
    let result!: UsePasswordResetReturn

    mockClient.requestPasswordReset.mockResolvedValue(undefined)
    mockClient.confirmPasswordReset.mockResolvedValue(undefined)

    scope.run(() => {
      result = usePasswordReset()
    })

    await result.requestReset({ email: 'user@b.com' })
    await result.confirmReset({ token: 'tok', password: 'newpass' })

    expect(result.requestStatus.value).toBe('resolved')
    expect(result.confirmStatus.value).toBe('resolved')

    result.reset()

    expect(result.requestStatus.value).toBe('idle')
    expect(result.requestError.value).toBeNull()
    expect(result.confirmStatus.value).toBe('idle')
    expect(result.confirmError.value).toBeNull()

    scope.stop()
  })
})

describe('useOAuth', () => {
  it('returns providers from config', () => {
    const scope = effectScope()
    let result!: UseOAuthReturn

    scope.run(() => {
      result = useOAuth({
        oauthProviders: ['github', 'google'],
      })
    })

    expect(result.providers.value).toEqual(['github', 'google'])

    scope.stop()
  })

  it('getOAuthUrl builds correct URL', () => {
    const scope = effectScope()
    let result!: UseOAuthReturn

    scope.run(() => {
      result = useOAuth({
        baseURL: 'https://api.example.com',
        oauthEndpoint: '/auth/oauth',
      })
    })

    expect(result.getOAuthUrl('github')).toBe('https://api.example.com/auth/oauth/github')

    scope.stop()
  })

  it('redirect sets window.location.href', () => {
    const scope = effectScope()
    let result!: UseOAuthReturn

    // Create a minimal window mock on globalThis for node environment
    const hadWindow = 'window' in globalThis
    const originalWindow = (globalThis as Record<string, unknown>).window
    ;(globalThis as Record<string, unknown>).window = { location: { href: '' } }

    scope.run(() => {
      result = useOAuth({
        baseURL: 'https://api.example.com',
        oauthProviders: ['github'],
      })
    })

    result.redirect('github')

    expect(
      (globalThis as Record<string, unknown> & { window: { location: { href: string } } }).window
        .location.href,
    ).toBe('https://api.example.com/oauth/github')

    // Restore
    if (hadWindow) {
      ;(globalThis as Record<string, unknown>).window = originalWindow
    } else {
      delete (globalThis as Record<string, unknown>).window
    }

    scope.stop()
  })
})
