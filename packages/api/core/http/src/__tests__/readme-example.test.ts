/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the fetch bond. Only the
 * global `fetch` (the network) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider as fetchClient } from '@molecule/api-http-fetch'

import type { HttpError } from '../index.js'
import { get, post, setClient } from '../index.js'

interface Item {
  id: string
  name: string
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the fetch client, reads JSON from .data and catches non-2xx as HttpError', async () => {
    vi.stubEnv('ITEMS_API_TOKEN', 'test-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '1', name: 'Widget' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'name is required' }), {
          status: 422,
          statusText: 'Unprocessable Entity',
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    setClient(fetchClient)

    const apiToken = process.env.ITEMS_API_TOKEN
    const res = await get<Item>('https://api.example.com/items/1', {
      headers: { Authorization: `Bearer ${apiToken}` },
      params: { expand: 'owner' },
      timeout: 5000,
    })
    const item = res.data
    expect(item).toEqual({ id: '1', name: 'Widget' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/items/1?expand=owner')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' })

    let caught: number | undefined
    try {
      await post<Item>('https://api.example.com/items', { name: '' }, { timeout: 5000 })
    } catch (error) {
      const status = (error as HttpError).response?.status
      if (status !== 422) throw error
      caught = status
    }
    expect(caught).toBe(422)
  })
})
