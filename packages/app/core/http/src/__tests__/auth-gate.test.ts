/**
 * A request must not leave before the session restore has settled.
 *
 * X1 xr-molecule-flash-m95 (+57:23), 25 min after the first deployed failure: a profile page
 * fetched `GET /profiles/:user` from its mount effect while the session restore was still in
 * flight, so the request carried no credentials and the server answered for an anonymous
 * viewer — a user the app followed rendered "Follow". On localhost the restore wins that race;
 * over the network it does not, so it showed up only on the deployed URL.
 *
 * These tests hold the gate open by hand and assert nothing reached `fetch` yet.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { awaitAuthGate, setAuthGate } from '../auth-gate.js'
import { createFetchClient } from '../provider.js'

/** A promise whose settlement this test controls. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const okResponse = (data: unknown = {}): Promise<object> =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  })

describe('the auth gate', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => okResponse())
    setAuthGate(null)
  })

  afterEach(() => {
    setAuthGate(null)
    vi.unstubAllGlobals()
  })

  it('holds a request until the gate resolves', async () => {
    const gate = deferred()
    setAuthGate(() => gate.promise)
    const client = createFetchClient({ baseURL: 'http://api.test' })

    const request = client.get('/profiles/alice')
    await Promise.resolve()
    await Promise.resolve()
    expect(mockFetch).not.toHaveBeenCalled()

    gate.resolve()
    await request
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('sends the request with the credential the restore produced while it was held', async () => {
    const gate = deferred()
    setAuthGate(() => gate.promise)
    const client = createFetchClient({ baseURL: 'http://api.test' })

    const request = client.get('/profiles/alice')
    await Promise.resolve()
    // What the restore does when it finishes: set the token on the client.
    client.setAuthToken('restored-token')
    gate.resolve()
    await request

    const [, init] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(init.headers.Authorization).toBe('Bearer restored-token')
  })

  it('holds a request from a client created BEFORE the gate was registered', async () => {
    // The app's client usually outlives the auth bond: `setupAuthDefault()` runs
    // and the http bond replaces the client — a gate stored on one instance
    // would be silently lost. This is why the gate is module-level.
    const client = createFetchClient({ baseURL: 'http://api.test' })
    const gate = deferred()
    setAuthGate(() => gate.promise)

    const request = client.get('/feed')
    await Promise.resolve()
    await Promise.resolve()
    expect(mockFetch).not.toHaveBeenCalled()

    gate.resolve()
    await request
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('sends the request rather than holding it forever when the gate rejects', async () => {
    setAuthGate(() => Promise.reject(new Error('restore failed')))
    const client = createFetchClient({ baseURL: 'http://api.test' })

    await expect(client.get('/feed')).resolves.toBeDefined()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('sends the request when the gate throws synchronously', async () => {
    // A gate is someone else's code; no shape of it may reject the request it was holding.
    setAuthGate(() => {
      throw new Error('bad gate')
    })
    const client = createFetchClient({ baseURL: 'http://api.test' })

    await expect(client.get('/feed')).resolves.toBeDefined()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('sends the request rather than holding it forever when the gate never settles', async () => {
    // A stalled restore must not hold back every request for the life of the page.
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      setAuthGate(() => new Promise<void>(() => {}))
      const client = createFetchClient({ baseURL: 'http://api.test' })

      const request = client.get('/feed')
      await vi.advanceTimersByTimeAsync(10_000)
      await request

      expect(mockFetch).toHaveBeenCalledTimes(1)
    } finally {
      errorSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('does not wait once the gate is cleared', async () => {
    setAuthGate(null)
    const client = createFetchClient({ baseURL: 'http://api.test' })

    await client.get('/feed')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('releases immediately when the registered gate has nothing in flight', async () => {
    setAuthGate(() => Promise.resolve())
    const client = createFetchClient({ baseURL: 'http://api.test' })

    await client.get('/feed')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('awaitAuthGate is a no-op with no gate registered', async () => {
    await expect(awaitAuthGate()).resolves.toBeUndefined()
  })
})

/**
 * X1 xr-molecule-flash-m97 `+48:05`: `@molecule/app-http`'s gate had no way out for the
 * request the gate's own restore makes. An app whose session store registers
 * `setAuthGate(() => whenSettled())` over a restore that fetches THROUGH the same client
 * deadlocks — the gate holds the restore's request, so the restore never settles and every
 * request on the page stalls the full bound (10 s then; 3 s now) with only a console warning.
 * `{ skipAuthGate: true }` is the way out, and the timeout report names it loudly.
 */
describe('the skipAuthGate opt-out', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => okResponse())
    setAuthGate(null)
  })

  afterEach(() => {
    setAuthGate(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends the request without waiting for the gate', async () => {
    setAuthGate(() => new Promise<void>(() => {}))
    const client = createFetchClient({ baseURL: 'http://api.test' })

    const request = client.get('/users/me', { skipAuthGate: true })
    await Promise.resolve()
    await Promise.resolve()

    // On the wire while the gate is still pending — not held for the bound and then sent.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await request
  })

  it('does not deadlock when the gate waits for a request made through the same client', async () => {
    // The store's shape: the gate settles only after a request that goes through the SAME
    // client the gate holds back. Without the opt-out that request is held too, the gate never
    // settles, and the page waits the whole bound (3 s) for the first response.
    const client = createFetchClient({ baseURL: 'http://api.test' })
    mockFetch.mockImplementation(() => okResponse({ user: { id: 'u1' } }))
    let restored = false
    setAuthGate(async () => {
      const response = await client.get<{ user: unknown }>('/users/me', { skipAuthGate: true })
      restored = Boolean(response.data.user)
    })

    const request = client.get('/profiles/alice')
    await Promise.resolve()
    await Promise.resolve()

    // The restore's own request went out straight away — only the page's request waits.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/users/me')

    await request
    expect(restored).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1]?.[0])).toContain('/profiles/alice')
  })

  it('does not stall every request when the gate shares one restore request (m97 shape)', async () => {
    // X1 xr-molecule-flash-m97 exactly: the app's store memoizes its restore, so the gate hands
    // out ONE promise whose request goes through the gated client. Without the opt-out that
    // request is held, the restore cannot settle, and every request the gate holds stalls the
    // full bound — the run read it as "noticeably slower, the deadlock was throttling everything".
    const client = createFetchClient({ baseURL: 'http://api.test' })
    mockFetch.mockImplementation(() => okResponse({ user: { id: 'u1' } }))
    let restore: Promise<void> | null = null
    const restoreOnce = (): Promise<void> => {
      restore ??= client.get('/users/me', { skipAuthGate: true }).then(() => undefined)
      return restore
    }
    setAuthGate(restoreOnce)

    const started = Date.now()
    await client.get('/profiles/alice')
    await client.get('/feed')

    expect(mockFetch.mock.calls.map((call) => String(call[0]))).toEqual([
      'http://api.test/users/me',
      'http://api.test/profiles/alice',
      'http://api.test/feed',
    ])
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it('leaves a request without the opt-out held', async () => {
    const gate = deferred()
    setAuthGate(() => gate.promise)
    const client = createFetchClient({ baseURL: 'http://api.test' })

    // Both go out, one with the opt-out and one without: the opt-out must not weaken the gate.
    await client.get('/users/me', { skipAuthGate: true })
    const held = client.get('/profiles/alice')
    await Promise.resolve()
    await Promise.resolve()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    gate.resolve()
    await held
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('reports a stalled gate once, at error level, naming the opt-out', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      setAuthGate(() => new Promise<void>(() => {}))
      const client = createFetchClient({ baseURL: 'http://api.test' })

      const first = client.get('/profiles/alice')
      const second = client.get('/feed')
      await vi.advanceTimersByTimeAsync(3_000)
      await Promise.all([first, second])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      // One report for the stuck gate, not one per held request (a console-error log on every
      // page load is noise a reader skips).
      expect(errorSpy).toHaveBeenCalledTimes(1)
      const logged = errorSpy.mock.calls.flat().map(String).join(' ')
      expect(logged).toContain('skipAuthGate: true')
      expect(logged).toContain('3000ms')
      // And it names what it held, so the caller can find the request to exempt.
      expect(logged).toContain('GET /profiles/alice')
      expect(logged).toContain('GET /feed')
    } finally {
      errorSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('says nothing when the gate settles', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setAuthGate(() => Promise.resolve())
    const client = createFetchClient({ baseURL: 'http://api.test' })

    await client.get('/feed')

    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

/**
 * X1 xr-molecule-flash-m173 (+20:37): the app wired `setAuthGate(() => restoreSession())`,
 * where `restoreSession` sent `GET /api/user` through the same gated client with no opt-out.
 * Every page held its requests 3 s and looped the restore, and the only trace was one console
 * line naming 917 held requests — cut, by every reader, before the sentence that named the
 * fix. A request the settle function issues while it runs is part of the restore the gate is
 * waiting for, so holding it makes the gate wait on itself.
 */
describe('the gate never holds its own restore request', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => okResponse())
    setAuthGate(null)
  })

  afterEach(() => {
    setAuthGate(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('settles when the gate’s own function calls the gated client (the m173 shape)', async () => {
    const client = createFetchClient({ baseURL: 'http://api.test' })
    mockFetch.mockImplementation(() => okResponse({ user: { id: 'u1' } }))
    let restored = false
    setAuthGate(async () => {
      const response = await client.get<{ user: unknown }>('/users/me')
      restored = Boolean(response.data.user)
    })

    const started = Date.now()
    // Neither request passes `skipAuthGate`: the restore's is recognized, the page's is held
    // until the restore settles.
    await client.get('/profiles/alice')

    expect(restored).toBe(true)
    // The deadlock cost every request the full 3 s bound; a resolved gate costs a round trip.
    expect(Date.now() - started).toBeLessThan(1_000)
    expect(mockFetch.mock.calls.map((call) => String(call[0]))).toEqual([
      'http://api.test/users/me',
      'http://api.test/profiles/alice',
    ])
  })

  it('invokes the settle function once for all the requests that share it', async () => {
    // A gate that issues a request per call floods the network while it is stuck: the m97
    // report measured 855 `fetch` calls for one page. Every request arriving while an
    // invocation is pending waits on that invocation instead of starting another.
    const gate = deferred()
    let calls = 0
    setAuthGate(() => {
      calls += 1
      return gate.promise
    })
    const client = createFetchClient({ baseURL: 'http://api.test' })

    const first = client.get('/profiles/alice')
    const second = client.get('/feed')
    const third = client.get('/articles')
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toBe(1)
    gate.resolve()
    await Promise.all([first, second, third])
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('still holds a page request that arrives while the gate is pending', async () => {
    // The bypass is scoped to the settle function's own execution — not to everything the
    // gate is pending over. A mount effect firing during the restore is the m95 race the
    // gate exists to hold: releasing it would send it anonymously.
    const gate = deferred()
    setAuthGate(() => gate.promise)
    const client = createFetchClient({ baseURL: 'http://api.test' })

    const first = client.get('/profiles/alice')
    await Promise.resolve()
    await Promise.resolve()
    expect(mockFetch).not.toHaveBeenCalled()

    const second = client.get('/feed')
    await Promise.resolve()
    await Promise.resolve()
    expect(mockFetch).not.toHaveBeenCalled()

    gate.resolve()
    await Promise.all([first, second])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('still holds a restore request issued after the settle function awaits first', async () => {
    // Only a request issued DURING the settle function is attributable to it. One issued from
    // a later continuation is indistinguishable from a page's first-paint request (which the
    // gate must hold), so it needs the documented opt-out — and the stall report says so.
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const client = createFetchClient({ baseURL: 'http://api.test' })
      setAuthGate(async () => {
        await Promise.resolve()
        await client.get('/users/me')
      })

      const request = client.get('/profiles/alice')
      await vi.advanceTimersByTimeAsync(3_000)
      await request

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(String(errorSpy.mock.calls.flat().map(String).join(' '))).toContain(
        'skipAuthGate: true',
      )
    } finally {
      errorSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  it('leads the stall report with the fix and bounds the request list', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      setAuthGate(() => new Promise<void>(() => {}))
      const distinct = [
        '/api/profile',
        '/api/feed',
        '/api/settings',
        '/api/articles',
        '/api/comments',
        '/api/tags',
        '/api/favorites',
      ]
      const waits = [
        ...Array.from({ length: 917 }, () => awaitAuthGate({ method: 'GET', url: '/api/user' })),
        ...distinct.map((url) => awaitAuthGate({ method: 'GET', url })),
      ]
      await vi.advanceTimersByTimeAsync(3_000)
      await Promise.all(waits)

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const logged = errorSpy.mock.calls.flat().map(String).join(' ')
      // molecule-dev's route walk keeps the first 200 characters of a console error: the
      // sentence naming the fix has to be inside that prefix (m173 never saw it).
      expect(logged.slice(0, 200)).toContain('skipAuthGate: true')
      // 924 performed, 8 distinct names: 5 are named and the other 919 are counted, so the
      // message stays readable instead of joining every held request.
      expect(logged).toContain('Held 924 request(s)')
      expect(logged).toContain('(and 919 more)')
      expect(logged.length).toBeLessThan(600)
    } finally {
      errorSpy.mockRestore()
      vi.useRealTimers()
    }
  })
})
