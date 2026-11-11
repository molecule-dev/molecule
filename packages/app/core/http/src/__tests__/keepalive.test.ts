/**
 * A small mutation fired just before a navigation has to outlive the page. X1 P237
 * xr-molecule-flash-l1764 clicked a favorite and the suite navigated at once; with no `keepalive`
 * on the shared client the app replaced `http.post`/`http.delete` with its own `fetch` to get it.
 * The option alone did not stop it: P277 l2087 and P288 l2161 lost the same favorite through
 * `http.post` without it (the profile's Favorited list read 0). In Chromium a plain POST is
 * cancelled a few milliseconds after the next page commits and a `keepalive` one completes, so the
 * client now keeps a small same-origin write alive by default.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  KEEPALIVE_DEFAULT_MAX_BODY_BYTES,
  KEEPALIVE_IN_FLIGHT_BUDGET_BYTES,
  keepaliveBytesInFlight,
  requestBodyBytes,
  reserveKeepalive,
} from '../keepalive.js'
import { createFetchClient } from '../provider.js'

const PAGE = { href: 'https://app.test/feed', origin: 'https://app.test' }

describe('RequestConfig.keepalive on the fetch client', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('location', PAGE)
    mockFetch.mockReset()
    mockFetch.mockImplementation(
      async () =>
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const options = (call = 0): RequestInit => mockFetch.mock.calls[call]?.[1] as RequestInit

  it.each([
    ['POST with no body', (c: ReturnType<typeof createFetchClient>) => c.post('/api/a/favorite')],
    ['DELETE', (c: ReturnType<typeof createFetchClient>) => c.delete('/api/a/favorite')],
    ['PUT with JSON', (c: ReturnType<typeof createFetchClient>) => c.put('/api/me', { bio: 'hi' })],
    ['PATCH with JSON', (c: ReturnType<typeof createFetchClient>) => c.patch('/api/me', { a: 1 })],
  ])('keeps a same-origin %s alive without being asked', async (_name, send) => {
    const response = await send(createFetchClient({ baseURL: '' }))
    expect(response.data).toEqual({ ok: true })
    expect(options()).toMatchObject({ keepalive: true })
    expect(keepaliveBytesInFlight()).toBe(0)
  })

  it('keeps a write to an absolute URL on the page origin alive', async () => {
    await createFetchClient({ baseURL: 'https://app.test/api' }).post('/follow')
    expect(options()).toMatchObject({ method: 'POST', keepalive: true })
  })

  it('sends reads, cross-origin writes, forms and large bodies as before', async () => {
    const same = createFetchClient({ baseURL: '/api' })
    await same.get('/articles')
    await createFetchClient({ baseURL: 'https://api.test' }).post('/articles/a/favorite')
    const form = new FormData()
    form.append('name', 'x')
    await same.post('/upload', form)
    await same.put('/me', { bio: 'x'.repeat(KEEPALIVE_DEFAULT_MAX_BODY_BYTES) })
    for (let call = 0; call < 4; call++) expect(options(call)).not.toHaveProperty('keepalive')
  })

  it('follows the caller in both directions', async () => {
    await createFetchClient({ baseURL: 'https://api.test' }).post('/a/favorite', undefined, {
      keepalive: true,
    })
    await createFetchClient({ baseURL: '/api' }).delete('/a/favorite', { keepalive: false })
    expect(options(0)).toMatchObject({ keepalive: true })
    expect(options(1)).not.toHaveProperty('keepalive')
  })

  it('does nothing outside a page', async () => {
    vi.stubGlobal('location', undefined)
    await createFetchClient({ baseURL: '/api' }).post('/a/favorite')
    expect(options()).not.toHaveProperty('keepalive')
  })

  it('stays inside the in-flight budget and returns it when the writes settle', async () => {
    const answers: Array<() => void> = []
    mockFetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) =>
          answers.push(() =>
            resolve(
              new Response('{"ok":true}', {
                status: 200,
                headers: { 'content-type': 'application/json' },
              }),
            ),
          ),
        ),
    )
    const client = createFetchClient({ baseURL: '/api' })
    // Each body is just under the per-request limit once JSON-encoded.
    const body = { text: 'x'.repeat(KEEPALIVE_DEFAULT_MAX_BODY_BYTES - 20) }
    const size = requestBodyBytes(JSON.stringify(body))!
    const fit = Math.floor(KEEPALIVE_IN_FLIGHT_BUDGET_BYTES / size)
    const pending = Array.from({ length: fit + 1 }, () => client.put('/notes', body))
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(fit + 1))
    const kept = mockFetch.mock.calls.filter(([, init]) => (init as RequestInit).keepalive)
    expect(kept).toHaveLength(fit)
    expect(keepaliveBytesInFlight()).toBe(fit * size)
    for (const answer of answers) answer()
    await Promise.all(pending)
    expect(keepaliveBytesInFlight()).toBe(0)
    const settled = answers.length
    const next = client.put('/notes', body)
    await vi.waitFor(() => expect(answers).toHaveLength(settled + 1))
    answers[settled]!()
    await next
    expect(options(fit + 1)).toMatchObject({ keepalive: true })
  })

  it('returns the reservation when the write fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createFetchClient({ baseURL: '/api' }).post('/a/favorite')).rejects.toThrow()
    expect(options()).toMatchObject({ keepalive: true })
    expect(keepaliveBytesInFlight()).toBe(0)
  })
})

describe('reserveKeepalive', () => {
  beforeEach(() => vi.stubGlobal('location', PAGE))
  afterEach(() => vi.unstubAllGlobals())

  it('measures bodies it can size and refuses the ones it cannot', () => {
    expect(requestBodyBytes(undefined)).toBe(0)
    expect(requestBodyBytes('é')).toBe(2)
    expect(requestBodyBytes(new Blob(['abc']))).toBe(3)
    expect(requestBodyBytes(new Uint8Array(5))).toBe(5)
    expect(requestBodyBytes(new URLSearchParams({ a: 'b' }))).toBe(3)
    expect(requestBodyBytes(new FormData())).toBeNull()
    expect(reserveKeepalive({ method: 'POST', url: '/x', body: new FormData() }).keepalive).toBe(
      false,
    )
  })

  it('releases once even when called twice', () => {
    const one = reserveKeepalive({ method: 'POST', url: '/x', body: 'abcd' })
    const two = reserveKeepalive({ method: 'POST', url: '/x', body: 'ef' })
    expect(keepaliveBytesInFlight()).toBe(6)
    one.release()
    one.release()
    expect(keepaliveBytesInFlight()).toBe(2)
    two.release()
    expect(keepaliveBytesInFlight()).toBe(0)
  })
})
