// @vitest-environment jsdom

import { act,renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach,describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'

import {
  useChangePassword,
  useLogin,
  useOAuth,
  usePasswordReset,
  useSignup,
} from '../hooks/index.js'
import { AuthProvider } from '../providers.js'

/**
 * Creates a mock auth client with configurable behavior.
 * @returns A mock AuthClient instance for testing.
 */
function createMockAuthClient(): AuthClient<{ id: string; email: string }> {
  type User = { id: string; email: string }
  let currentUser: User | null = null
  let authenticated = false
  const listeners = new Set<() => void>()

  const getState = (): AuthState<User> => ({
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
    getRefreshToken: () => (authenticated ? 'mock-refresh-token' : null),
    login: vi.fn().mockImplementation(async () => {
      currentUser = { id: '1', email: 'test@example.com' }
      authenticated = true
      listeners.forEach((l) => l())
      return {
        user: currentUser,
        accessToken: 'mock-token',
        expiresAt: Date.now() + 3600000,
      }
    }),
    logout: vi.fn().mockImplementation(async () => {
      currentUser = null
      authenticated = false
      listeners.forEach((l) => l())
    }),
    register: vi.fn().mockImplementation(async () => {
      currentUser = { id: '2', email: 'new@example.com' }
      authenticated = true
      listeners.forEach((l) => l())
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

/**
 * Creates a test wrapper component with an AuthProvider.
 * @param client - The auth client instance to provide.
 * @returns A wrapper component for renderHook.
 */
function createWrapper(client: AuthClient<{ id: string; email: string }>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider client={client}>{children}</AuthProvider>
  }
}

describe('useLogin', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.value).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful login', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' })
    })

    expect(result.current.status).toBe('resolved')
    expect(result.current.value).toBeTruthy()
    expect(result.current.value!.user).toEqual({ id: '1', email: 'test@example.com' })
    expect(result.current.error).toBeNull()
    expect(client.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' })
  })

  it('should transition idle -> pending -> rejected on failed login', async () => {
    client.login = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.status).toBe('idle')

    await act(async () => {
      try {
        await result.current.login({ email: 'test@example.com', password: 'wrong' })
      } catch {
        // Expected rejection
      }
    })

    expect(result.current.status).toBe('rejected')
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error!.message).toBe('Invalid credentials')
    expect(result.current.value).toBeNull()
  })

  it('should reset state to idle', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' })
    })

    expect(result.current.status).toBe('resolved')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.value).toBeNull()
    expect(result.current.error).toBeNull()
  })
})

describe('useSignup', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = renderHook(() => useSignup(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.value).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful signup', async () => {
    const { result } = renderHook(() => useSignup(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.signup({ email: 'new@example.com', password: 'password123', name: 'New User' })
    })

    expect(result.current.status).toBe('resolved')
    expect(result.current.value).toBeTruthy()
    expect(result.current.value!.user).toEqual({ id: '2', email: 'new@example.com' })
    expect(result.current.error).toBeNull()
    expect(client.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })
  })

  it('should transition idle -> pending -> rejected on failed signup', async () => {
    client.register = vi.fn().mockRejectedValue(new Error('Email already exists'))

    const { result } = renderHook(() => useSignup(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      try {
        await result.current.signup({ email: 'existing@example.com', password: 'password' })
      } catch {
        // Expected rejection
      }
    })

    expect(result.current.status).toBe('rejected')
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error!.message).toBe('Email already exists')
  })
})

describe('useChangePassword', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start in idle state', () => {
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('should transition idle -> pending -> resolved on successful change', async () => {
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.changePassword('oldPass', 'newPass')
    })

    expect(result.current.status).toBe('resolved')
    expect(result.current.error).toBeNull()
    expect(client.changePassword).toHaveBeenCalledWith('oldPass', 'newPass')
  })

  it('should transition idle -> pending -> rejected on failed change', async () => {
    client.changePassword = vi.fn().mockRejectedValue(new Error('Incorrect old password'))

    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      try {
        await result.current.changePassword('wrongOld', 'newPass')
      } catch {
        // Expected rejection
      }
    })

    expect(result.current.status).toBe('rejected')
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error!.message).toBe('Incorrect old password')
  })
})

describe('usePasswordReset', () => {
  let client: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    client = createMockAuthClient()
  })

  it('should start with both states idle', () => {
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.requestStatus).toBe('idle')
    expect(result.current.requestError).toBeNull()
    expect(result.current.confirmStatus).toBe('idle')
    expect(result.current.confirmError).toBeNull()
  })

  it('should track request and confirm steps independently', async () => {
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: createWrapper(client),
    })

    // Request step
    await act(async () => {
      await result.current.requestReset({ email: 'test@example.com' })
    })

    expect(result.current.requestStatus).toBe('resolved')
    expect(result.current.confirmStatus).toBe('idle')
    expect(client.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@example.com' })

    // Confirm step
    await act(async () => {
      await result.current.confirmReset({ token: 'reset-token', password: 'newPassword' })
    })

    expect(result.current.requestStatus).toBe('resolved')
    expect(result.current.confirmStatus).toBe('resolved')
    expect(client.confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'newPassword',
    })
  })

  it('should reset both states', async () => {
    const { result } = renderHook(() => usePasswordReset(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.requestReset({ email: 'test@example.com' })
    })

    await act(async () => {
      await result.current.confirmReset({ token: 'token', password: 'pass' })
    })

    expect(result.current.requestStatus).toBe('resolved')
    expect(result.current.confirmStatus).toBe('resolved')

    act(() => {
      result.current.reset()
    })

    expect(result.current.requestStatus).toBe('idle')
    expect(result.current.requestError).toBeNull()
    expect(result.current.confirmStatus).toBe('idle')
    expect(result.current.confirmError).toBeNull()
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

  it('should return providers from config', () => {
    const { result } = renderHook(
      () => useOAuth({ oauthProviders: ['github', 'google', 'gitlab'] }),
      { wrapper: createWrapper(client) },
    )

    expect(result.current.providers).toEqual(['github', 'google', 'gitlab'])
  })

  it('should return empty providers when none configured', () => {
    const { result } = renderHook(() => useOAuth(), {
      wrapper: createWrapper(client),
    })

    expect(result.current.providers).toEqual([])
  })

  it('should build correct OAuth URL', () => {
    const { result } = renderHook(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
          oauthEndpoint: '/auth/oauth',
        }),
      { wrapper: createWrapper(client) },
    )

    expect(result.current.getOAuthUrl('github')).toBe(
      'https://api.example.com/auth/oauth/github',
    )
  })

  it('should use default oauth endpoint', () => {
    const { result } = renderHook(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['google'],
        }),
      { wrapper: createWrapper(client) },
    )

    expect(result.current.getOAuthUrl('google')).toBe('https://api.example.com/oauth/google')
  })

  it('should redirect to provider URL', () => {
    const { result } = renderHook(
      () =>
        useOAuth({
          baseURL: 'https://api.example.com',
          oauthProviders: ['github'],
        }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.redirect('github')
    })

    expect(window.location.href).toBe('https://api.example.com/oauth/github')
  })
})
