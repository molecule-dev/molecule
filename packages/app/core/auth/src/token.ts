/**
 * Token management utilities for authentication.
 *
 * Provides token storage, JWT parsing, and expiration checking.
 *
 * @module
 */

import type { StorageAdapter, TokenStorage, UserProfile } from './types.js'

/**
 * Creates a token storage implementation backed by either in-memory
 * storage or a custom `StorageAdapter`.
 *
 * @param storage - `'memory'` for in-memory storage (lost on refresh),
 *   or a `StorageAdapter` for persistent storage.
 * @param prefix - Key prefix for storage items (default: `'molecule:auth:'`).
 * @returns A `TokenStorage` instance.
 *
 * @example
 * ```typescript
 * // In-memory storage (default)
 * const storage = createTokenStorage('memory')
 *
 * // Custom storage adapter from @molecule/app-storage
 * import { getProvider } from '@molecule/app-storage'
 * const provider = getProvider()
 * const storage = createTokenStorage({
 *   getItem: (key) => provider.get(key),
 *   setItem: (key, value) => provider.set(key, value),
 *   removeItem: (key) => provider.remove(key),
 * })
 * ```
 */
export const createTokenStorage = (
  storage: 'memory' | StorageAdapter = 'memory',
  prefix: string = 'molecule:auth:',
): TokenStorage => {
  const memoryStore: Record<string, string | null> = {}

  // Determine storage adapter
  let adapter: StorageAdapter | null = null
  if (typeof storage === 'object') {
    adapter = storage
  }

  const get = (key: string): string | null => {
    if (adapter) {
      return adapter.getItem(prefix + key)
    }
    return memoryStore[key] ?? null
  }

  const set = (key: string, value: string | null): void => {
    if (adapter) {
      if (value === null) {
        adapter.removeItem(prefix + key)
      } else {
        adapter.setItem(prefix + key, value)
      }
    } else {
      memoryStore[key] = value
    }
  }

  return {
    getAccessToken: () => get('accessToken'),
    setAccessToken: (token) => set('accessToken', token),
    getRefreshToken: () => get('refreshToken'),
    setRefreshToken: (token) => set('refreshToken', token),
    getUser: <T = UserProfile>(): T | null => {
      const data = get('user')
      if (!data) return null
      try {
        return JSON.parse(data) as T
      } catch {
        return null
      }
    },
    setUser: <T = UserProfile>(user: T | null) => {
      set('user', user ? JSON.stringify(user) : null)
    },
    clear: () => {
      set('accessToken', null)
      set('refreshToken', null)
      set('user', null)
    },
  }
}

/**
 * Parses a JWT token payload without verification (base64-decodes
 * the payload segment).
 *
 * @param token - The raw JWT string (header.payload.signature).
 * @returns The decoded payload object, or `null` if parsing fails.
 */
export const parseJWT = <T = Record<string, unknown>>(token: string): T | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as T
  } catch {
    return null
  }
}

/**
 * Checks if a JWT token is expired (or will expire within the buffer window).
 *
 * @param token - The raw JWT string.
 * @param bufferSeconds - Seconds before actual expiry to consider the token expired (default: 0).
 * @returns `true` if the token is expired or lacks an `exp` claim.
 */
export const isTokenExpired = (token: string, bufferSeconds: number = 0): boolean => {
  const payload = parseJWT<{ exp?: number }>(token)
  if (!payload || !payload.exp) return true
  const expiresAt = payload.exp * 1000
  const now = Date.now() + bufferSeconds * 1000
  return now >= expiresAt
}

/**
 * Returns the expiration timestamp of a JWT token in milliseconds.
 *
 * @param token - The raw JWT string.
 * @returns The expiration time in ms since epoch, or `null` if the token has no `exp` claim.
 */
export const getTokenExpiration = (token: string): number | null => {
  const payload = parseJWT<{ exp?: number }>(token)
  if (!payload || !payload.exp) return null
  return payload.exp * 1000
}
