import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@molecule/app-http'

import { createJWTAuthClient } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const response = (data: unknown) => ({
  data,
  status: 422,
  statusText: 'Unprocessable Content',
  headers: { 'x-request-id': 'safe' },
  config: { method: 'POST' as const, url: '/safe' },
})

describe('round-eight auth HTTP capture', () => {
  it('reads a branded response accessor once and settles login with HttpError', async () => {
    const original = new HttpError('failed', 422, response({ safe: 'same' }))
    let reads = 0
    const safeResponse = original.response
    Object.defineProperty(original, 'response', {
      enumerable: true,
      configurable: true,
      get() {
        reads++
        if (reads > 1) throw new Error('/auth?token=second-read-secret')
        return safeResponse
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"user":{"id":"u1"}}', { status: 200 })),
    )
    const client = createJWTAuthClient({
      autoRefresh: false,
      mapAuthResponse: () => {
        throw original
      },
    })
    await client.initialize()

    const caught = await client
      .login({ email: 'a@example.test', password: 'input' })
      .catch((error: unknown) => error)

    expect(reads).toBe(1)
    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).response!.data).toEqual({ safe: 'same' })
    expect(caught.message).not.toContain('second-read-secret')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })
})
