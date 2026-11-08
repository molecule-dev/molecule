/**
 * A small mutation fired just before a navigation has to outlive the page. X1 P237
 * xr-molecule-flash-l1764 clicked a favorite and the suite navigated at once; with no `keepalive`
 * on the shared client the app replaced `http.post`/`http.delete` with its own `fetch` to get it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../provider.js'

describe('RequestConfig.keepalive on the fetch client', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
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

  it('sends fetch keepalive when the request asks for it', async () => {
    const client = createFetchClient({ baseURL: 'https://api.test' })
    const response = await client.post('/articles/a/favorite', undefined, { keepalive: true })
    expect(response.data).toEqual({ ok: true })
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', keepalive: true })
  })

  it('leaves keepalive off when the request does not ask for it', async () => {
    const client = createFetchClient({ baseURL: 'https://api.test' })
    await client.delete('/articles/a/favorite')
    expect(mockFetch.mock.calls[0]?.[1]).not.toHaveProperty('keepalive')
  })
})
