import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, StorageAdapter, UserProfile } from '../types.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []

function storageWithToken(token?: string): StorageAdapter {
  const values = new Map(token ? [['molecule:auth:accessToken', token]] : [])
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

afterEach(() => {
  for (const client of clients.splice(0)) client.destroy()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('bounded auth restore', () => {
  it('honors a configured request deadline', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', { cookie: 'mol_auth=1' })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const client = createJWTAuthClient({
      storage: storageWithToken(),
      autoRefresh: false,
      requestTimeout: 25,
    })
    clients.push(client)
    void client.initialize()
    await vi.advanceTimersByTimeAsync(24)
    expect(client.getState().status).toBe('loading')
    await vi.advanceTimersByTimeAsync(1)
    expect(client.getState().status).toBe('unavailable')
    await client.whenRestored!()
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects an invalid deadline %s',
    (requestTimeout) => {
      expect(() => createJWTAuthClient({ requestTimeout })).toThrow(RangeError)
    },
  )

  it('cancels a pending request and its timer when the client is destroyed', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', { cookie: 'mol_auth=1' })
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, init) => {
        signal = init?.signal ?? undefined
        return new Promise<Response>(() => {})
      }),
    )
    const client = createJWTAuthClient({ storage: storageWithToken(), autoRefresh: false })
    const restored = client.initialize()
    client.destroy()
    await restored
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['headers', 'body'] as const)(
    'releases a cookie restore with hung %s as unavailable',
    async (stage) => {
      vi.useFakeTimers()
      vi.stubGlobal('document', { cookie: 'mol_auth=1' })
      let signal: AbortSignal | undefined
      const fetchBoundary = vi.fn<typeof fetch>((_url, init) => {
        signal = init?.signal ?? undefined
        if (stage === 'headers') return new Promise<Response>(() => {})
        return Promise.resolve({ ok: true, json: () => new Promise(() => {}) } as Response)
      })
      vi.stubGlobal('fetch', fetchBoundary)
      const client = createJWTAuthClient({ storage: storageWithToken(), autoRefresh: false })
      clients.push(client)
      const restored = client.initialize()
      expect(client.getState().status).toBe('loading')

      await vi.advanceTimersByTimeAsync(10_000)

      expect(client.getState()).toMatchObject({
        status: 'unavailable',
        initialized: true,
        user: null,
      })
      expect(signal?.aborted).toBe(true)
      expect(document.cookie).toContain('mol_auth=1')
      await restored
      await client.whenRestored!()
      expect(vi.getTimerCount()).toBe(0)

      // A timeout preserves the candidate: an explicit retry can still restore it.
      fetchBoundary.mockResolvedValueOnce(Response.json({ user }))
      await client.validateSession!()
      expect(client.getState()).toMatchObject({ status: 'authenticated', user })
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('bounds token-only restore without deleting its bearer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const client = createJWTAuthClient({
      storage: storageWithToken('opaque-bearer'),
      autoRefresh: false,
    })
    clients.push(client)
    void client.initialize()

    await vi.advanceTimersByTimeAsync(10_000)

    expect(client.getState()).toMatchObject({ status: 'unavailable', initialized: true })
    expect(client.getAccessToken()).toBe('opaque-bearer')
    await client.whenRestored!()
  })

  it('does not adopt a response that arrives after timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', { cookie: 'mol_auth=1' })
    let answer!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            answer = resolve
          }),
      ),
    )
    const client = createJWTAuthClient({ storage: storageWithToken(), autoRefresh: false })
    clients.push(client)
    void client.initialize()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(client.getState().status).toBe('unavailable')

    answer(Response.json({ user }))
    await vi.advanceTimersByTimeAsync(0)
    expect(client.getState()).toMatchObject({ status: 'unavailable', user: null })
  })

  it('clears the request timer when a normal restore succeeds', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', { cookie: 'mol_auth=1' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user })),
    )
    const client = createJWTAuthClient({ storage: storageWithToken(), autoRefresh: false })
    clients.push(client)
    await client.initialize()
    expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true, user })
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(client.getState().status).toBe('authenticated')
  })
})

describe('sign-in during an initial restore', () => {
  it.each(['login', 'register'] as const)(
    '%s initializes the session before the old restore can finish',
    async (method) => {
      vi.stubGlobal('document', { cookie: 'mol_auth=1' })
      let answer!: (response: Response) => void
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>((url) =>
          String(url).endsWith('/users/me')
            ? new Promise<Response>((resolve) => {
                answer = resolve
              })
            : Promise.resolve(Response.json({ accessToken: 'new-token', user })),
        ),
      )
      const client = createJWTAuthClient({ storage: storageWithToken(), autoRefresh: false })
      clients.push(client)
      const restored = client.initialize()
      await client[method]({ email: 'reader@example.test', password: 'password' })
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true, user })
      answer(Response.json({ user: { id: 'old-account' } }))
      await restored
      client.setUser({ ...user, name: 'Edited name' })
      expect(client.getState()).toMatchObject({
        status: 'authenticated',
        initialized: true,
        user: { id: 'reader', name: 'Edited name' },
      })
    },
  )
})
