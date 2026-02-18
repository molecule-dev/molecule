import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createJWTAuthClient,
  createTokenStorage,
  getClient,
  getTokenExpiration,
  getUser,
  isAuthenticated,
  isTokenExpired,
  login,
  logout,
  parseJWT,
  register,
  setClient,
} from '../index.js'
import type { UserProfile } from '../types.js'

/**
 * Mock StorageAdapter for Node environment
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
  readonly length: number
  key: (i: number) => string | null
} => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] || null,
  }
}

// Setup before all tests
beforeEach(() => {
  // Intentionally left minimal — no localStorage/sessionStorage stubs needed
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Test utilities
 */

const createMockResponse = <T>(
  data: T,
  status = 200,
): Promise<{
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json: () => Promise<T>
}> => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })
}

// Create a valid JWT token (header.payload.signature)
const createMockJWT = (payload: Record<string, unknown>): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadB64 = btoa(JSON.stringify(payload))
  const signature = btoa('mock-signature')
  return `${header}.${payloadB64}.${signature}`
}

const mockUser: UserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.png',
  roles: ['user'],
  metadata: { verified: true },
}

/**
 * Token Storage Tests
 */
describe('Token Storage', () => {
  describe('createTokenStorage with StorageAdapter', () => {
    it('should create storage with default prefix', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      storage.setAccessToken('test-token')
      expect(adapter.getItem('molecule:auth:accessToken')).toBe('test-token')
    })

    it('should create storage with custom prefix', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter, 'custom:')

      storage.setAccessToken('test-token')
      expect(adapter.getItem('custom:accessToken')).toBe('test-token')
    })

    it('should get and set access token', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      expect(storage.getAccessToken()).toBeNull()
      storage.setAccessToken('access-123')
      expect(storage.getAccessToken()).toBe('access-123')
    })

    it('should clear access token when set to null', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      storage.setAccessToken('token')
      expect(storage.getAccessToken()).toBe('token')

      storage.setAccessToken(null)
      expect(storage.getAccessToken()).toBeNull()
    })

    it('should get and set refresh token', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      expect(storage.getRefreshToken()).toBeNull()
      storage.setRefreshToken('refresh-456')
      expect(storage.getRefreshToken()).toBe('refresh-456')
    })

    it('should get and set user', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      expect(storage.getUser()).toBeNull()
      storage.setUser(mockUser)
      expect(storage.getUser()).toEqual(mockUser)
    })

    it('should clear user when set to null', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      storage.setUser(mockUser)
      storage.setUser(null)
      expect(storage.getUser()).toBeNull()
    })

    it('should handle invalid JSON in user storage', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      adapter.setItem('molecule:auth:user', 'invalid-json')
      expect(storage.getUser()).toBeNull()
    })

    it('should clear all tokens', () => {
      const adapter = createMockStorage()
      const storage = createTokenStorage(adapter)

      storage.setAccessToken('access')
      storage.setRefreshToken('refresh')
      storage.setUser(mockUser)

      storage.clear()

      expect(storage.getAccessToken()).toBeNull()
      expect(storage.getRefreshToken()).toBeNull()
      expect(storage.getUser()).toBeNull()
    })
  })

  describe('createTokenStorage with separate adapters', () => {
    it('should isolate storage between different adapters', () => {
      const adapter1 = createMockStorage()
      const adapter2 = createMockStorage()
      const storage1 = createTokenStorage(adapter1)
      const storage2 = createTokenStorage(adapter2)

      storage1.setAccessToken('token-1')
      expect(storage1.getAccessToken()).toBe('token-1')
      expect(storage2.getAccessToken()).toBeNull()
    })
  })

  describe('createTokenStorage with memory', () => {
    it('should store tokens in memory', () => {
      const storage = createTokenStorage('memory')

      storage.setAccessToken('memory-token')
      expect(storage.getAccessToken()).toBe('memory-token')
    })

    it('should handle all operations in memory mode', () => {
      const storage = createTokenStorage('memory')

      storage.setAccessToken('access')
      storage.setRefreshToken('refresh')
      storage.setUser(mockUser)

      expect(storage.getAccessToken()).toBe('access')
      expect(storage.getRefreshToken()).toBe('refresh')
      expect(storage.getUser()).toEqual(mockUser)

      storage.clear()

      expect(storage.getAccessToken()).toBeNull()
      expect(storage.getRefreshToken()).toBeNull()
      expect(storage.getUser()).toBeNull()
    })
  })
})

/**
 * JWT Parsing Tests
 */
describe('JWT Utilities', () => {
  describe('parseJWT', () => {
    it('should parse a valid JWT token', () => {
      const payload = { sub: 'user-123', exp: 1234567890 }
      const token = createMockJWT(payload)

      const result = parseJWT(token)
      expect(result).toEqual(payload)
    })

    it('should return null for invalid token format', () => {
      expect(parseJWT('invalid')).toBeNull()
      expect(parseJWT('only.two')).toBeNull()
      expect(parseJWT('')).toBeNull()
    })

    it('should return null for invalid base64', () => {
      expect(parseJWT('a.!!!invalid!!!.c')).toBeNull()
    })

    it('should handle URL-safe base64 characters', () => {
      // Create a token with URL-safe base64 characters
      const payload = { data: 'test+value/with=special' }
      const token = createMockJWT(payload)

      const result = parseJWT(token)
      expect(result).toEqual(payload)
    })
  })

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const token = createMockJWT({ exp: pastTime })

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return false for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const token = createMockJWT({ exp: futureTime })

      expect(isTokenExpired(token)).toBe(false)
    })

    it('should account for buffer seconds', () => {
      const almostExpired = Math.floor(Date.now() / 1000) + 30 // 30 seconds from now
      const token = createMockJWT({ exp: almostExpired })

      expect(isTokenExpired(token, 0)).toBe(false)
      expect(isTokenExpired(token, 60)).toBe(true) // With 60s buffer, considered expired
    })

    it('should return true for token without exp claim', () => {
      const token = createMockJWT({ sub: 'user-123' })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true)
    })
  })

  describe('getTokenExpiration', () => {
    it('should return expiration time in milliseconds', () => {
      const expTime = 1700000000 // Unix timestamp in seconds
      const token = createMockJWT({ exp: expTime })

      expect(getTokenExpiration(token)).toBe(expTime * 1000)
    })

    it('should return null for token without exp claim', () => {
      const token = createMockJWT({ sub: 'user-123' })
      expect(getTokenExpiration(token)).toBeNull()
    })

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid')).toBeNull()
    })
  })
})

/**
 * JWT Auth Client Tests
 */
describe('JWT Auth Client', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  describe('createJWTAuthClient', () => {
    it('should create client with default configuration', () => {
      const client = createJWTAuthClient()

      expect(client.getState()).toEqual({
        initialized: false,
        authenticated: false,
        user: null,
        loading: false,
        error: null,
      })
    })

    it('should create client with custom configuration', () => {
      const client = createJWTAuthClient({
        baseURL: 'https://api.example.com',
        loginEndpoint: '/custom/login',
        storage: createMockStorage(),
        storagePrefix: 'custom:',
      })

      expect(client).toBeDefined()
    })
  })

  describe('getState', () => {
    it('should return current auth state', () => {
      const client = createJWTAuthClient()
      const state = client.getState()

      expect(state.initialized).toBe(false)
      expect(state.authenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      const client = createJWTAuthClient()
      expect(client.isAuthenticated()).toBe(false)
    })

    it('should return true after successful login', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(client.isAuthenticated()).toBe(true)
    })
  })

  describe('getUser', () => {
    it('should return null when not authenticated', () => {
      const client = createJWTAuthClient()
      expect(client.getUser()).toBeNull()
    })

    it('should return user after login', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(client.getUser()).toEqual(mockUser)
    })
  })

  describe('getAccessToken', () => {
    it('should return null when no token stored', () => {
      const client = createJWTAuthClient()
      expect(client.getAccessToken()).toBeNull()
    })

    it('should return access token after login', async () => {
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(client.getAccessToken()).toBe(accessToken)
    })
  })

  describe('getRefreshToken', () => {
    it('should return null when no refresh token stored', () => {
      const client = createJWTAuthClient()
      expect(client.getRefreshToken()).toBeNull()
    })

    it('should return refresh token after login', async () => {
      const refreshToken = 'refresh-token-123'
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
          refreshToken,
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(client.getRefreshToken()).toBe(refreshToken)
    })
  })

  describe('login', () => {
    it('should successfully login and update state', async () => {
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
          refreshToken: 'refresh-123',
          expiresAt: Date.now() + 3600000,
        }),
      )

      const client = createJWTAuthClient()
      const result = await client.login({ email: 'test@example.com', password: 'password' })

      expect(result.user).toEqual(mockUser)
      expect(result.accessToken).toBe(accessToken)
      expect(client.isAuthenticated()).toBe(true)
      expect(client.getUser()).toEqual(mockUser)
    })

    it('should send credentials to login endpoint', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.login({ email: 'test@example.com', password: 'password123', remember: true })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            remember: true,
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should use custom login endpoint', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient({ loginEndpoint: '/custom/signin' })
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(mockFetch).toHaveBeenCalledWith('/custom/signin', expect.any(Object))
    })

    it('should set loading state during login', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              createMockResponse({
                user: mockUser,
                accessToken: createMockJWT({
                  sub: mockUser.id,
                  exp: Math.floor(Date.now() / 1000) + 3600,
                }),
              }),
            )
          }, 10)
        })
      })

      const client = createJWTAuthClient()

      const loginPromise = client.login({ email: 'test@example.com', password: 'password' })

      // Should be loading
      expect(client.getState().loading).toBe(true)

      await loginPromise

      // Should not be loading after completion
      expect(client.getState().loading).toBe(false)
    })

    it('should emit login event on success', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const eventHandler = vi.fn()
      client.addEventListener(eventHandler)

      await client.login({ email: 'test@example.com', password: 'password' })

      expect(eventHandler).toHaveBeenCalledWith({ type: 'login', user: mockUser })
    })

    it('should handle login failure', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Invalid credentials' }, 401))

      const client = createJWTAuthClient()

      await expect(client.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow()

      expect(client.isAuthenticated()).toBe(false)
      expect(client.getState().error).toBeTruthy()
    })

    it('should emit error event on login failure', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Invalid credentials' }, 401))

      const client = createJWTAuthClient()
      const eventHandler = vi.fn()
      client.addEventListener(eventHandler)

      try {
        await client.login({ email: 'test@example.com', password: 'wrong' })
      } catch {
        // Expected
      }

      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    })
  })

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      // First login
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })
      expect(client.isAuthenticated()).toBe(true)

      // Then logout
      mockFetch.mockImplementation(() => createMockResponse({}))
      await client.logout()

      expect(client.isAuthenticated()).toBe(false)
      expect(client.getUser()).toBeNull()
      expect(client.getAccessToken()).toBeNull()
      expect(client.getRefreshToken()).toBeNull()
    })

    it('should call logout endpoint', async () => {
      // Setup authenticated state
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
        }),
      )

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.login({ email: 'test@example.com', password: 'password' })
      mockFetch.mockReset()
      mockFetch.mockImplementation(() => createMockResponse({}))

      await client.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        }),
      )
    })

    it('should emit logout event', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      const eventHandler = vi.fn()
      client.addEventListener(eventHandler)

      mockFetch.mockImplementation(() => createMockResponse({}))
      await client.logout()

      expect(eventHandler).toHaveBeenCalledWith({ type: 'logout' })
    })

    it('should complete even if logout endpoint fails', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      await client.login({ email: 'test@example.com', password: 'password' })

      // Make logout endpoint fail
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Server error' }, 500))

      await client.logout()

      // Should still be logged out locally
      expect(client.isAuthenticated()).toBe(false)
    })
  })

  describe('register', () => {
    it('should successfully register and authenticate', async () => {
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
          refreshToken: 'refresh-123',
        }),
      )

      const client = createJWTAuthClient()
      const result = await client.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })

      expect(result.user).toEqual(mockUser)
      expect(client.isAuthenticated()).toBe(true)
    })

    it('should send registration data to register endpoint', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        metadata: { referral: 'friend' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'new@example.com',
            password: 'password123',
            name: 'New User',
            metadata: { referral: 'friend' },
          }),
        }),
      )
    })

    it('should emit register event on success', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const eventHandler = vi.fn()
      client.addEventListener(eventHandler)

      await client.register({ email: 'new@example.com', password: 'password123' })

      expect(eventHandler).toHaveBeenCalledWith({ type: 'register', user: mockUser })
    })

    it('should handle registration failure', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Email already exists' }, 400))

      const client = createJWTAuthClient()

      await expect(
        client.register({ email: 'existing@example.com', password: 'password' }),
      ).rejects.toThrow()

      expect(client.isAuthenticated()).toBe(false)
      expect(client.getState().error).toBeTruthy()
    })
  })

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Initial login
      const oldAccessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 60,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: oldAccessToken,
          refreshToken: 'refresh-old',
        }),
      )

      const client = createJWTAuthClient({ autoRefresh: false })
      await client.login({ email: 'test@example.com', password: 'password' })

      // Refresh
      const newAccessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: newAccessToken,
          refreshToken: 'refresh-new',
        }),
      )

      const result = await client.refresh()

      expect(result.accessToken).toBe(newAccessToken)
      expect(client.getAccessToken()).toBe(newAccessToken)
      expect(client.getRefreshToken()).toBe('refresh-new')
    })

    it('should throw error when no refresh token available', async () => {
      const client = createJWTAuthClient()

      await expect(client.refresh()).rejects.toThrow('No refresh token available')
    })

    it('should emit refresh event on success', async () => {
      // Login first
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({ sub: mockUser.id, exp: Math.floor(Date.now() / 1000) + 60 }),
          refreshToken: 'refresh-token',
        }),
      )

      const client = createJWTAuthClient({ autoRefresh: false })
      await client.login({ email: 'test@example.com', password: 'password' })

      const eventHandler = vi.fn()
      client.addEventListener(eventHandler)

      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      await client.refresh()

      expect(eventHandler).toHaveBeenCalledWith({ type: 'refresh' })
    })
  })

  describe('requestPasswordReset', () => {
    it('should send password reset request', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.requestPasswordReset({ email: 'test@example.com' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/password/reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        }),
      )
    })
  })

  describe('confirmPasswordReset', () => {
    it('should confirm password reset', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.confirmPasswordReset({ token: 'reset-token-123', password: 'newPassword123' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/password/reset/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'reset-token-123', password: 'newPassword123' }),
        }),
      )
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      // Login first
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
        }),
      )

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.login({ email: 'test@example.com', password: 'password' })

      // Update profile
      const updatedUser = { ...mockUser, name: 'Updated Name' }
      mockFetch.mockImplementation(() => createMockResponse(updatedUser))

      const result = await client.updateProfile({ name: 'Updated Name' })

      expect(result.name).toBe('Updated Name')
      expect(client.getUser()?.name).toBe('Updated Name')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/profile',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        }),
      )
    })
  })

  describe('changePassword', () => {
    it('should change password', async () => {
      // Login first
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
        }),
      )

      const client = createJWTAuthClient({ baseURL: 'https://api.example.com' })
      await client.login({ email: 'test@example.com', password: 'password' })

      mockFetch.mockImplementation(() => createMockResponse({}))

      await client.changePassword('oldPassword', 'newPassword')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/password/change',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ oldPassword: 'oldPassword', newPassword: 'newPassword' }),
        }),
      )
    })
  })

  describe('custom password endpoints', () => {
    it('should use custom forgotPasswordEndpoint', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))

      const client = createJWTAuthClient({
        baseURL: 'https://api.example.com',
        forgotPasswordEndpoint: '/users/forgot-password',
      })
      await client.requestPasswordReset({ email: 'test@example.com' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/forgot-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        }),
      )
    })

    it('should use custom resetPasswordEndpoint', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))

      const client = createJWTAuthClient({
        baseURL: 'https://api.example.com',
        resetPasswordEndpoint: '/users/reset-password',
      })
      await client.confirmPasswordReset({ token: 'token-123', password: 'newPass' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/reset-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'token-123', password: 'newPass' }),
        }),
      )
    })

    it('should use custom changePasswordEndpoint', async () => {
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() => createMockResponse({ user: mockUser, accessToken }))

      const client = createJWTAuthClient({
        baseURL: 'https://api.example.com',
        changePasswordEndpoint: '/users/password',
      })
      await client.login({ email: 'test@example.com', password: 'password' })

      mockFetch.mockImplementation(() => createMockResponse({}))
      await client.changePassword('oldPass', 'newPass')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ oldPassword: 'oldPass', newPassword: 'newPass' }),
        }),
      )
    })
  })

  describe('initialize', () => {
    it('should initialize with valid stored token and user', async () => {
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      const adapter = createMockStorage()
      adapter.setItem('molecule:auth:accessToken', accessToken)
      adapter.setItem('molecule:auth:user', JSON.stringify(mockUser))

      const client = createJWTAuthClient({ autoRefresh: false, storage: adapter })
      await client.initialize()

      expect(client.getState().initialized).toBe(true)
      expect(client.isAuthenticated()).toBe(true)
      expect(client.getUser()).toEqual(mockUser)
    })

    it('should clear state if stored token is expired and no refresh token', async () => {
      const expiredToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) - 3600,
      })
      const adapter = createMockStorage()
      adapter.setItem('molecule:auth:accessToken', expiredToken)
      adapter.setItem('molecule:auth:user', JSON.stringify(mockUser))

      const client = createJWTAuthClient({ storage: adapter })
      await client.initialize()

      expect(client.getState().initialized).toBe(true)
      expect(client.isAuthenticated()).toBe(false)
    })

    it('should attempt refresh if token expired but refresh token exists', async () => {
      const expiredToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) - 3600,
      })
      const newToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })

      const adapter = createMockStorage()
      adapter.setItem('molecule:auth:accessToken', expiredToken)
      adapter.setItem('molecule:auth:refreshToken', 'refresh-token')
      adapter.setItem('molecule:auth:user', JSON.stringify(mockUser))

      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: newToken,
        }),
      )

      const client = createJWTAuthClient({ autoRefresh: false, storage: adapter })
      await client.initialize()

      expect(client.getState().initialized).toBe(true)
      expect(client.isAuthenticated()).toBe(true)
      expect(client.getAccessToken()).toBe(newToken)
    })

    it('should clear state if refresh fails during initialize', async () => {
      const expiredToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) - 3600,
      })

      const adapter = createMockStorage()
      adapter.setItem('molecule:auth:accessToken', expiredToken)
      adapter.setItem('molecule:auth:refreshToken', 'refresh-token')
      adapter.setItem('molecule:auth:user', JSON.stringify(mockUser))

      mockFetch.mockImplementation(() => createMockResponse({ error: 'Refresh failed' }, 401))

      const client = createJWTAuthClient({ storage: adapter })
      await client.initialize()

      expect(client.getState().initialized).toBe(true)
      expect(client.isAuthenticated()).toBe(false)
    })

    it('should initialize as unauthenticated when no stored tokens', async () => {
      const client = createJWTAuthClient()
      await client.initialize()

      expect(client.getState().initialized).toBe(true)
      expect(client.isAuthenticated()).toBe(false)
    })
  })

  describe('subscribe', () => {
    it('should notify subscribers on state changes', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const callback = vi.fn()

      client.subscribe(callback)
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(callback).toHaveBeenCalled()
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(lastCall.authenticated).toBe(true)
    })

    it('should allow unsubscribing', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const callback = vi.fn()

      const unsubscribe = client.subscribe(callback)
      unsubscribe()

      await client.login({ email: 'test@example.com', password: 'password' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('addEventListener', () => {
    it('should add and remove event listeners', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const listener = vi.fn()

      const removeListener = client.addEventListener(listener)
      await client.login({ email: 'test@example.com', password: 'password' })

      expect(listener).toHaveBeenCalledWith({ type: 'login', user: mockUser })

      listener.mockClear()
      removeListener()

      mockFetch.mockImplementation(() => createMockResponse({}))
      await client.logout()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const client = createJWTAuthClient()
      const stateCallback = vi.fn()
      const eventCallback = vi.fn()

      client.subscribe(stateCallback)
      client.addEventListener(eventCallback)
      await client.login({ email: 'test@example.com', password: 'password' })

      stateCallback.mockClear()
      eventCallback.mockClear()

      client.destroy()

      // Callbacks should not be called after destroy
      mockFetch.mockImplementation(() => createMockResponse({}))
      try {
        await client.logout()
      } catch {
        // May throw but that's ok
      }

      expect(stateCallback).not.toHaveBeenCalled()
      expect(eventCallback).not.toHaveBeenCalled()
    })
  })

  describe('auto refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should schedule token refresh', async () => {
      const expiresIn = 120 // 2 minutes
      const accessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      })

      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken,
          refreshToken: 'refresh-token',
        }),
      )

      const client = createJWTAuthClient({
        autoRefresh: true,
        refreshBuffer: 60, // Refresh 60s before expiry
      })
      await client.login({ email: 'test@example.com', password: 'password' })

      // Advance time to just before refresh should happen
      const newAccessToken = createMockJWT({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: newAccessToken,
        }),
      )

      // Advance timer to trigger refresh (expiresIn - refreshBuffer = 60 seconds)
      vi.advanceTimersByTime(60 * 1000)

      // Allow async operations to complete
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.any(Object),
      )
    })
  })
})

/**
 * Provider Tests
 */
describe('Auth Provider', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    // Reset the provider's current client
    setClient(createJWTAuthClient())
  })

  describe('setClient / getClient', () => {
    it('should set and get custom client', () => {
      const customClient = createJWTAuthClient({ baseURL: 'https://custom.com' })
      setClient(customClient)

      expect(getClient()).toBe(customClient)
    })

    it('should create default client if none set', () => {
      // Create a fresh module state by getting client
      const client = getClient()
      expect(client).toBeDefined()
      expect(typeof client.login).toBe('function')
    })
  })
})

/**
 * Utility Functions Tests
 */
describe('Auth Utilities', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    // Reset provider state
    setClient(createJWTAuthClient())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('isAuthenticated', () => {
    it('should return false when not logged in', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('should return true after login', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      await login({ email: 'test@example.com', password: 'password' })

      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('getUser', () => {
    it('should return null when not logged in', () => {
      expect(getUser()).toBeNull()
    })

    it('should return user after login', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      await login({ email: 'test@example.com', password: 'password' })

      expect(getUser()).toEqual(mockUser)
    })

    it('should work with typed user profiles', async () => {
      interface CustomUser extends UserProfile {
        customField: string
      }

      const customUser: CustomUser = { ...mockUser, customField: 'custom' }
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: customUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      await login({ email: 'test@example.com', password: 'password' })

      const user = getUser<CustomUser>()
      expect(user?.customField).toBe('custom')
    })
  })

  describe('login', () => {
    it('should login using the global client', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const result = await login({ email: 'test@example.com', password: 'password' })

      expect(result.user).toEqual(mockUser)
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('logout', () => {
    it('should logout using the global client', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      await login({ email: 'test@example.com', password: 'password' })
      expect(isAuthenticated()).toBe(true)

      mockFetch.mockImplementation(() => createMockResponse({}))
      await logout()

      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('register', () => {
    it('should register using the global client', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          user: mockUser,
          accessToken: createMockJWT({
            sub: mockUser.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      )

      const result = await register({ email: 'new@example.com', password: 'password123' })

      expect(result.user).toEqual(mockUser)
      expect(isAuthenticated()).toBe(true)
    })
  })
})
