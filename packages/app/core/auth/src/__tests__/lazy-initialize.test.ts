/**
 * A client that nobody called `initialize()` on restores itself on the first read.
 *
 * xr-molecule-flash-m192 (+09:36 → +24:06): a `main.tsx` rewrite dropped the template's
 * `authClient.initialize().catch(() => {})` line, so `status` stayed `'loading'` on every
 * page load — 18 tests timed out on a form an auth-gated page never rendered. The client
 * starts at `'loading'` and used to leave it only through an explicit `initialize()` (or a
 * sign-in); initialization is now lazy and idempotent, so a read restores the session and
 * an explicit call shares the same one request.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { UserProfile } from '../types.js'

/**
 * A `StorageAdapter` over an object, enough for the token/state assertions.
 *
 * @returns The adapter plus a direct read of the backing store.
 */
const createMockStorage = (): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
}

/**
 * A fetch-shaped response for the client's `ok`/`status`/`json()` reads.
 *
 * @param data - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
const createMockResponse = <T>(data: T, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })

/**
 * A JWT whose `exp` is `seconds` from now (negative for an expired one).
 *
 * @param seconds - Seconds until expiry.
 * @returns The token.
 */
const createJWT = (seconds: number): string =>
  [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })),
    btoa('mock-signature'),
  ].join('.')

const user: UserProfile = { id: 'ann', email: 'ann@example.com', name: 'Ann' }

/** The current-user probes a restore made. */
const restoreCalls = (mockFetch: ReturnType<typeof vi.fn>): unknown[][] =>
  mockFetch.mock.calls.filter((call) => String(call[0]).includes('/users/me'))

describe('lazy initialization — a dropped initialize() is no longer fatal', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  it('renders a stored session on the FIRST getState(), with no initialize() call', () => {
    const storage = createMockStorage()
    storage.setItem('molecule:auth:accessToken', createJWT(3600))
    storage.setItem('molecule:auth:user', JSON.stringify(user))

    const client = createJWTAuthClient({ storage, autoRefresh: false })

    // The read every hook makes first (`useAuth()`'s snapshot) — the template's explicit
    // `initialize()` line is gone, as it was in m192's rewritten main.tsx.
    const state = client.getState()

    expect(state).toMatchObject({
      status: 'authenticated',
      initialized: true,
      authenticated: true,
      user,
    })
    // The store held the whole session, so restoring it costs no request.
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not leave an anonymous client `loading` after the first read', async () => {
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })

    // Before the restore settles there is genuinely no decision yet.
    expect(client.getState().status).toBe('loading')

    // The first read started it; `whenRestored()` is the same restore's signal.
    await client.whenRestored()

    expect(client.getState()).toMatchObject({
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
    })
  })

  it('starts the same restore from subscribe()/onAuthChange()', async () => {
    const storage = createMockStorage()
    storage.setItem('molecule:auth:accessToken', createJWT(3600))
    storage.setItem('molecule:auth:user', JSON.stringify(user))
    const client = createJWTAuthClient({ storage, autoRefresh: false })

    const subscription = client.subscribe(() => {})
    // The restore's stored-session half runs synchronously, before the subscription returns.
    expect(client.getState().authenticated).toBe(true)
    subscription()

    const second = createJWTAuthClient({ storage, autoRefresh: false })
    const unsubscribe = second.onAuthChange(() => {})
    expect(second.getState().authenticated).toBe(true)
    unsubscribe()
  })

  it('shares one restore between a read and an explicit initialize()', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    mockFetch.mockImplementation(() => createMockResponse({ user }))
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })

    // A hook reads first (this is what a provider mount does) ...
    client.getState()
    // ... and the template's explicit call arrives afterwards.
    await client.initialize()

    expect(restoreCalls(mockFetch)).toHaveLength(1)
    expect(client.isAuthenticated()).toBe(true)
  })

  it('double initialize() sends one request', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    mockFetch.mockImplementation(() => createMockResponse({ user }))
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })

    await Promise.all([client.initialize(), client.initialize()])

    expect(restoreCalls(mockFetch)).toHaveLength(1)
    expect(client.getState().status).toBe('authenticated')
  })

  it('keeps the explicit-call path unchanged: one call restores and later reads are free', async () => {
    const storage = createMockStorage()
    storage.setItem('molecule:auth:accessToken', createJWT(3600))
    storage.setItem('molecule:auth:user', JSON.stringify(user))
    const client = createJWTAuthClient({ storage, autoRefresh: false })

    await client.initialize()

    expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    // A read after the restore is a plain read: no second restore, no second request.
    client.getState()
    client.isAuthenticated()
    client.getUser()
    await client.initialize()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('a restore that fails still settles the state instead of leaving it loading', async () => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
    mockFetch.mockImplementation(() => Promise.reject(new Error('network down')))
    const client = createJWTAuthClient({ storage: createMockStorage(), autoRefresh: false })

    // The lazy read must not produce an unhandled rejection.
    client.getState()
    await client.whenRestored()

    expect(client.getState()).toMatchObject({ status: 'unauthenticated', initialized: true })
  })
})
