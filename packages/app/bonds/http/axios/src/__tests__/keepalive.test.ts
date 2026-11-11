/**
 * Keepalive on the Axios provider. XHR cannot outlive the page, so a request kept alive goes through
 * Axios's fetch adapter with fetch's own `keepalive`. A small same-origin write is kept alive by
 * default, as on `@molecule/app-http`'s fetch client: X1 P277 l2087 and P288 l2161 lost a favorite
 * clicked just before a navigation (in Chromium a plain POST is cancelled a few milliseconds after
 * the next page commits). Drives a real Axios instance, as `skip-auth-gate.test.ts` does.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KEEPALIVE_DEFAULT_MAX_BODY_BYTES, keepaliveBytesInFlight } from '@molecule/app-http'

import { createAxiosClient } from '../provider.js'

const PAGE = { href: 'https://app.test/feed', origin: 'https://app.test' }

interface Sent {
  url: string
  method: string
  keepalive: boolean
  credentials: RequestCredentials
}

let sent: Sent[]
let answer: () => Promise<Response>

const ok = async (): Promise<Response> =>
  new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  sent = []
  answer = ok
  vi.stubGlobal('location', PAGE)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      sent.push({
        url: input.url,
        method: input.method,
        keepalive: input.keepalive,
        credentials: input.credentials,
      })
      return answer()
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  expect(keepaliveBytesInFlight()).toBe(0)
})

/** A client on the page's own origin whose every request goes through the fetch adapter. */
const onFetch = (baseURL = 'https://app.test/api'): ReturnType<typeof createAxiosClient> =>
  createAxiosClient({ baseURL, axiosConfig: { adapter: 'fetch' } })

describe('the keepalive default on the Axios provider', () => {
  it('moves a small same-origin write from the instance adapter to fetch with keepalive', async () => {
    // No adapter configured: Axios's own list. Outside a browser that is the http adapter, so a
    // request reaching the stubbed fetch at all shows the move.
    const client = createAxiosClient({ baseURL: 'https://app.test/api' })
    const response = await client.post('/articles/a/favorite')
    expect(response.data).toEqual({ ok: true })
    expect(sent).toEqual([
      {
        url: 'https://app.test/api/articles/a/favorite',
        method: 'POST',
        keepalive: true,
        credentials: 'same-origin',
      },
    ])
  })

  it.each([
    ['PUT with JSON', (c: ReturnType<typeof onFetch>) => c.put('/user', { bio: 'hi' })],
    ['PATCH with JSON', (c: ReturnType<typeof onFetch>) => c.patch('/user', { bio: 'hi' })],
    ['DELETE', (c: ReturnType<typeof onFetch>) => c.delete('/articles/a/favorite')],
    [
      'request() POST',
      (c: ReturnType<typeof onFetch>) => c.request({ method: 'POST', url: '/follow', data: {} }),
    ],
  ])('keeps a same-origin %s alive', async (_name, send) => {
    await send(onFetch())
    expect(sent.map((s) => s.keepalive)).toEqual([true])
  })

  it('sends reads, cross-origin writes, forms and large bodies as before', async () => {
    const same = onFetch()
    await same.get('/articles')
    await onFetch('https://api.test').post('/articles/a/favorite')
    const form = new FormData()
    form.append('name', 'x')
    await same.post('/upload', form)
    await same.put('/user', { bio: 'x'.repeat(KEEPALIVE_DEFAULT_MAX_BODY_BYTES) })
    await same.post('/upload', { name: 'x' }, { options: { onUploadProgress: () => {} } })
    expect(sent.map((s) => s.keepalive)).toEqual([false, false, false, false, false])
  })

  it('decides on the URL a request interceptor leaves', async () => {
    const client = onFetch()
    client.addRequestInterceptor((config) => ({ ...config, url: 'https://api.test/favorite' }))
    await client.post('/articles/a/favorite')
    expect(sent).toMatchObject([{ url: 'https://api.test/favorite', keepalive: false }])
  })

  it('follows the caller in both directions', async () => {
    await onFetch('https://api.test').post('/a/favorite', undefined, { keepalive: true })
    await onFetch().delete('/a/favorite', { keepalive: false })
    expect(sent.map((s) => s.keepalive)).toEqual([true, false])
  })

  it('keeps a custom adapter function, which is the caller transport', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))
    const client = createAxiosClient({ baseURL: 'https://app.test/api', axiosConfig: { adapter } })
    await client.post('/articles/a/favorite')
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(sent).toEqual([])
  })

  it('sends the page cookies on a kept-alive request unless credentials are asked for', async () => {
    // Axios's fetch adapter turns `withCredentials: false` into `credentials: 'omit'`; XHR sends
    // same-origin cookies either way, so the kept-alive request must too.
    await onFetch().post('/a/favorite')
    await createAxiosClient({ baseURL: 'https://api.test' }).post('/a/favorite', undefined, {
      keepalive: true,
    })
    await createAxiosClient({ baseURL: 'https://api.test', withCredentials: true }).post(
      '/a/favorite',
      undefined,
      { keepalive: true },
    )
    expect(sent.map((s) => s.credentials)).toEqual(['same-origin', 'same-origin', 'include'])
  })

  it('returns the reservation after a failed write and after every retried attempt', async () => {
    answer = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(onFetch().post('/a/favorite')).rejects.toThrow()
    expect(keepaliveBytesInFlight()).toBe(0)

    let calls = 0
    answer = async () =>
      ++calls < 3
        ? new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })
        : ok()
    await onFetch().put('/user', { bio: 'hi' }, { retry: { baseDelayMs: 1, maxDelayMs: 1 } })
    expect(sent.slice(1).map((s) => [s.method, s.keepalive])).toEqual([
      ['PUT', true],
      ['PUT', true],
      ['PUT', true],
    ])
  })
})
