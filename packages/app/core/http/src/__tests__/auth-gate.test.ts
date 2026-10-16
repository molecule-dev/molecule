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
    try {
      setAuthGate(() => new Promise<void>(() => {}))
      const client = createFetchClient({ baseURL: 'http://api.test' })

      const request = client.get('/feed')
      await vi.advanceTimersByTimeAsync(10_000)
      await request

      expect(mockFetch).toHaveBeenCalledTimes(1)
    } finally {
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
