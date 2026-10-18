// @vitest-environment jsdom
/**
 * The auth client's storage default in a browser: Web Storage.
 *
 * An in-memory default loses the session on every full page load. In xr-molecule-flash-m158 the
 * scaffold's generated auth bond was rewritten without its explicit `storage`, so the token landed
 * in a process-local Map: the suite's `page.goto` after sign-in signed the user out and 40 of 65
 * local failures were that one cause.
 *
 * The store is stubbed: this Node has an experimental global `localStorage` of its own that
 * shadows jsdom's, and it is unusable without `--localstorage-file`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'

/** A real `Storage`-shaped store the browser adapter can probe and write to. */
const installStorage = (): Storage => {
  const raw = new Map<string, string>()
  const store = {
    getItem: (key: string) => raw.get(key) ?? null,
    setItem: (key: string, value: string) => {
      raw.set(key, value)
    },
    removeItem: (key: string) => {
      raw.delete(key)
    },
    clear: () => raw.clear(),
    key: (index: number) => Array.from(raw.keys())[index] ?? null,
    get length() {
      return raw.size
    },
  }
  vi.stubGlobal('localStorage', store)
  return store as Storage
}

describe('createJWTAuthClient in a browser', () => {
  let store: Storage

  beforeEach(() => {
    store = installStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('writes a tokenKey token to localStorage when no storage is given', () => {
    const client = createJWTAuthClient({ tokenKey: 'jwtToken' })

    client.setAccessToken('token-1')

    expect(store.getItem('jwtToken')).toBe('token-1')
    client.destroy()
  })

  it('keeps the session at its own prefixed key too, not only when tokenKey is set', () => {
    const client = createJWTAuthClient()

    client.setAccessToken('token-2')

    expect(store.getItem('molecule:auth:accessToken')).toBe('token-2')
    client.destroy()
  })

  it('warns once when tokenKey is paired with an explicit memory store', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const client = createJWTAuthClient({ tokenKey: 'jwtToken', storage: 'memory' })
    client.setAccessToken('token-3')

    // The explicit store wins — nothing is written where the contract reads.
    expect(store.getItem('jwtToken')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    const message = warn.mock.calls[0]?.map((part) => String(part)).join(' ') ?? ''
    expect(message).toContain("tokenKey 'jwtToken' is in memory")
    expect(message).toContain('storage: createBrowserStorageAdapter()')
    client.destroy()
  })

  it('stays in memory where there is no browser window (SSR, a Node test)', () => {
    vi.stubGlobal('window', undefined)

    const client = createJWTAuthClient({ tokenKey: 'jwtToken' })
    client.setAccessToken('token-4')

    // Nothing reached the store, and a fresh client cannot see the token.
    expect(store.getItem('jwtToken')).toBeNull()
    expect(client.getAccessToken()).toBe('token-4')
    expect(createJWTAuthClient({ tokenKey: 'jwtToken' }).getAccessToken()).toBeNull()
    client.destroy()
  })
})
