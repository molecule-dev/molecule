/**
 * `RequestConfig.keepalive` on the Axios provider. XHR cannot outlive the page, so a keepalive
 * request goes through Axios's fetch adapter with fetch's own `keepalive`; every other request keeps
 * the instance's adapter. Drives a real Axios instance, as `skip-auth-gate.test.ts` does.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAxiosClient } from '../provider.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RequestConfig.keepalive on the Axios provider', () => {
  it('sends the request through fetch with keepalive', async () => {
    const seen: Array<boolean | undefined> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: Request | string, init?: RequestInit) => {
        seen.push(init?.keepalive ?? (typeof input === 'string' ? undefined : input.keepalive))
        return new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )
    const client = createAxiosClient({ baseURL: 'http://api.test' })
    const response = await client.post('/articles/a/favorite', undefined, { keepalive: true })
    expect(response.data).toEqual({ ok: true })
    expect(seen).toEqual([true])
  })

  it('keeps the instance adapter when keepalive is not asked for', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))
    const client = createAxiosClient({ baseURL: 'http://api.test', axiosConfig: { adapter } })
    await client.post('/articles/a/favorite')
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
