import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBrowserStorageAdapter, createJWTAuthClient } from '../index.js'
import type { StorageAdapter, UserProfile } from '../types.js'

/**
 * A Web Storage double: the three adapter methods plus the extra members a real
 * `Storage` object carries, so it stands in for `localStorage` / `sessionStorage`
 * in a Node test.
 */
const memoryStorage = (): StorageAdapter & { raw: Map<string, string> } => {
  const raw = new Map<string, string>()
  return {
    raw,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => {
      raw.set(key, value)
    },
    removeItem: (key) => {
      raw.delete(key)
    },
  }
}

// Create a valid JWT token (header.payload.signature)
const createMockJWT = (payload: Record<string, unknown>): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadB64 = btoa(JSON.stringify(payload))
  const signature = btoa('mock-signature')
  return `${header}.${payloadB64}.${signature}`
}

const createMockResponse = (data: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  }) as unknown as Response

const mockUser: UserProfile = { id: 'u1', email: 'ann@example.com', name: 'Ann' }

describe('createBrowserStorageAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes through to the store it was given', () => {
    const store = memoryStorage()
    const adapter = createBrowserStorageAdapter({ storage: store })

    adapter.setItem('molecule:auth:accessToken', 'tok-1')

    expect(store.raw.get('molecule:auth:accessToken')).toBe('tok-1')
    expect(adapter.getItem('molecule:auth:accessToken')).toBe('tok-1')
  })

  it("hands a later adapter the earlier one's value — the read a reload makes", () => {
    const store = memoryStorage()
    createBrowserStorageAdapter({ storage: store }).setItem('molecule:auth:accessToken', 'tok-1')

    // A new page: a new adapter over the same browser store.
    expect(
      createBrowserStorageAdapter({ storage: store }).getItem('molecule:auth:accessToken'),
    ).toBe('tok-1')
  })

  it('clears a stored key', () => {
    const store = memoryStorage()
    const adapter = createBrowserStorageAdapter({ storage: store })
    adapter.setItem('k', 'v')

    adapter.removeItem('k')

    expect(store.raw.has('k')).toBe(false)
    expect(adapter.getItem('k')).toBeNull()
  })

  it('uses localStorage by default when the browser has one', () => {
    const local = memoryStorage()
    const session = memoryStorage()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)

    createBrowserStorageAdapter().setItem('molecule:auth:accessToken', 'tok-1')

    expect(local.raw.get('molecule:auth:accessToken')).toBe('tok-1')
    expect(session.raw.size).toBe(0)
  })

  it('uses sessionStorage when asked for the tab-scoped kind', () => {
    const local = memoryStorage()
    const session = memoryStorage()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)

    createBrowserStorageAdapter({ kind: 'session' }).setItem('molecule:auth:accessToken', 'tok-1')

    expect(session.raw.get('molecule:auth:accessToken')).toBe('tok-1')
    expect(local.raw.size).toBe(0)
  })

  it('keeps values in memory, without throwing, when there is no Web Storage at all', () => {
    vi.stubGlobal('localStorage', undefined)
    const adapter = createBrowserStorageAdapter()

    expect(() => adapter.setItem('k', 'v')).not.toThrow()
    expect(adapter.getItem('k')).toBe('v')
    // The documented degradation: the value did not persist anywhere.
    expect(createBrowserStorageAdapter().getItem('k')).toBeNull()
  })

  it('survives a store that is present but throws on every write', () => {
    const blocked: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error('SecurityError: the operation is insecure')
      },
      removeItem: () => {},
    }
    const adapter = createBrowserStorageAdapter({ storage: blocked })

    expect(() => adapter.setItem('k', 'v')).not.toThrow()
    expect(adapter.getItem('k')).toBe('v')
  })

  it('falls back to memory when the store accepts the probe but rejects the write (quota)', () => {
    const full = memoryStorage()
    const quota = 3
    const store: StorageAdapter = {
      getItem: full.getItem,
      setItem: (key, value) => {
        if (key !== '__molecule_auth_probe__' && value.length > quota) {
          const error = new Error('QuotaExceededError')
          error.name = 'QuotaExceededError'
          throw error
        }
        full.setItem(key, value)
      },
      removeItem: full.removeItem,
    }
    const adapter = createBrowserStorageAdapter({ storage: store })

    expect(() => adapter.setItem('k', 'a-long-value')).not.toThrow()
    expect(adapter.getItem('k')).toBe('a-long-value')
  })
})

describe('a signed-in session across a page reload', () => {
  const mockFetch = vi.fn()
  const store = memoryStorage()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    store.raw.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // A Node test has no `window`, so the client's default here is memory — the state a browser
  // would be in only if it had no usable Web Storage (the adapter then degrades to memory too).
  it('is lost outside a browser, where the default is memory (the state X1 flash-m98 spent 34 minutes on)', async () => {
    const token = createMockJWT({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 })
    mockFetch.mockImplementation(() => createMockResponse({ accessToken: token, user: mockUser }))
    const first = createJWTAuthClient({ baseURL: '/api' })
    await first.login({ email: 'ann@example.com', password: 'pw' })

    // The reload: a fresh client, and nothing on disk to restore from.
    const reloaded = createJWTAuthClient({ baseURL: '/api' })
    await reloaded.initialize()

    expect(reloaded.isAuthenticated()).toBe(false)
    first.destroy()
    reloaded.destroy()
  })

  it('survives the reload when the client has a persistent adapter (flash-m98)', async () => {
    const token = createMockJWT({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 })
    mockFetch.mockImplementation(() => createMockResponse({ accessToken: token, user: mockUser }))
    const first = createJWTAuthClient({
      baseURL: '/api',
      storage: createBrowserStorageAdapter({ storage: store }),
    })
    await first.login({ email: 'ann@example.com', password: 'pw' })
    expect(first.isAuthenticated()).toBe(true)

    // The reload: a fresh client over the same browser store, and no request —
    // the token the first page stored is what puts the user back.
    mockFetch.mockClear()
    const reloaded = createJWTAuthClient({
      baseURL: '/api',
      storage: createBrowserStorageAdapter({ storage: store }),
    })
    await reloaded.initialize()

    expect(reloaded.isAuthenticated()).toBe(true)
    expect(reloaded.getUser()).toMatchObject({ email: 'ann@example.com' })
    expect(mockFetch).not.toHaveBeenCalled()
    first.destroy()
    reloaded.destroy()
  })
})
