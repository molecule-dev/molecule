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
 * @param tokenKey - Exact key for the access token (default `${prefix}accessToken`),
 *   for a store another tool reads at its own key.
 * @returns A `TokenStorage` instance.
 *
 * @example
 * ```typescript
 * // In-memory storage (this factory's default; the client's browser default is
 * // createBrowserStorageAdapter — pass `'memory'` there for a cookie session)
 * const storage = createTokenStorage('memory')
 *
 * // The browser's persistent storage — a reload keeps the session
 * import { createBrowserStorageAdapter } from '@molecule/app-auth'
 * const storage = createTokenStorage(createBrowserStorageAdapter())
 * ```
 */
export const createTokenStorage = (
  storage: 'memory' | StorageAdapter = 'memory',
  prefix: string = 'molecule:auth:',
  tokenKey?: string,
): TokenStorage => {
  const memoryStore: Record<string, string | null> = {}

  // Determine storage adapter
  let adapter: StorageAdapter | null = null
  if (typeof storage === 'object') {
    adapter = storage
  }

  const accessTokenKey = (): string => tokenKey ?? `${prefix}accessToken`

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

  // The access token can live under an exact key (`tokenKey`) that another tool
  // reads; the refresh token and the cached user always use the prefix.
  const getTokenValue = (): string | null => {
    if (adapter) return adapter.getItem(accessTokenKey())
    return memoryStore.accessToken ?? null
  }

  const setTokenValue = (value: string | null): void => {
    if (adapter) {
      if (value === null) adapter.removeItem(accessTokenKey())
      else adapter.setItem(accessTokenKey(), value)
    } else {
      memoryStore.accessToken = value
    }
  }

  return {
    getAccessToken: getTokenValue,
    setAccessToken: setTokenValue,
    getRefreshToken: () => get('refreshToken'),
    setRefreshToken: (token) => set('refreshToken', token),
    getUser: <T = UserProfile>(): T | null => {
      const data = get('user')
      if (!data) return null
      try {
        return JSON.parse(data) as T
      } catch (_error) {
        // Stored value is not valid JSON (corrupted/stale); returning null is safe
        return null
      }
    },
    setUser: <T = UserProfile>(user: T | null) => {
      set('user', user ? JSON.stringify(user) : null)
    },
    clear: () => {
      setTokenValue(null)
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
  } catch (_error) {
    // Malformed base64 or invalid JSON payload; returning null is the documented contract
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
