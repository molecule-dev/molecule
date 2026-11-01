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

const loginWithFailure = async (original: HttpError) => {
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
  return { caught, client }
}

describe('round-nine auth failure reconstruction', () => {
  it('preserves a native HttpError stack', async () => {
    const original = new HttpError('body failed', 422, response({ safe: 'body' }))
    const before = original.stack
    const { caught, client } = await loginWithFailure(original)
    try {
      expect(caught).toBeInstanceOf(HttpError)
      expect(caught.stack).toBe(before)
    } finally {
      client.destroy()
    }
  })

  it('reads application accessors on the original receiver', async () => {
    const original = new HttpError('failed', 422, response({ safe: 'body' }))
    const messages = new WeakMap<object, string>([[original, 'readable application message']])
    Object.defineProperty(original, 'message', {
      get() {
        return messages.get(this) ?? 'WRONG RECEIVER'
      },
      configurable: true,
    })
    const { caught, client } = await loginWithFailure(original)
    try {
      expect(caught).toBeInstanceOf(HttpError)
      expect(caught.message).toBe('readable application message')
      expect(client.getState().error).toBe('readable application message')
    } finally {
      client.destroy()
    }
  })

  it('settles login safely when the branded response getter throws', async () => {
    const original = new HttpError('failed', 422, response({ safe: 'body' }))
    Object.defineProperty(original, 'response', {
      get() {
        throw new Error('/error?token=accessor-credential')
      },
      configurable: true,
    })
    const { caught, client } = await loginWithFailure(original)
    try {
      expect(caught).toBeInstanceOf(HttpError)
      expect(caught.message).not.toContain('accessor-credential')
      expect(client.getState().loading).toBe(false)
      expect(client.getState().error).not.toContain('accessor-credential')
    } finally {
      client.destroy()
    }
  })

  it('retains non-enumerable response data across the real login path', async () => {
    const bodyResponse = response({ safe: 'body' })
    Object.defineProperty(bodyResponse, 'data', {
      value: { safe: 'body' },
      enumerable: false,
    })
    const original = new HttpError('failed', 422, response({ safe: 'body' }))
    Object.defineProperty(original, 'response', {
      get: () => bodyResponse,
      configurable: true,
      enumerable: true,
    })
    const { caught, client } = await loginWithFailure(original)
    try {
      expect(caught).toBeInstanceOf(HttpError)
      expect((caught as HttpError).response!.data).toEqual({ safe: 'body' })
      expect(client.getState().loading).toBe(false)
    } finally {
      client.destroy()
    }
  })
})
