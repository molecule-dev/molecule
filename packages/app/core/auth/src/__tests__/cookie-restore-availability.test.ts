import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { StorageAdapter } from '../types.js'

/** A storage adapter whose bearer survives the restore attempt. */
function storedBearer(): { storage: StorageAdapter; token: string } {
  const token = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('signature'),
  ].join('.')
  const values = new Map([['molecule:auth:accessToken', token]])
  return {
    token,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }
}

/** A real response for the client's fetch boundary. */
function response(status: number): Response {
  return new Response(JSON.stringify({ error: 'restore failed' }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('session restore failure classification', () => {
  beforeEach(() => {
    ;(globalThis as { document?: { cookie: string } }).document = { cookie: 'mol_auth=1' }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { document?: unknown }).document
  })

  it.each([404, 503, 'network'] as const)(
    'keeps a cookie-only session candidate unavailable after %s',
    async (answer) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          if (answer === 'network') throw new TypeError('network down')
          return response(answer)
        }),
      )
      const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
      try {
        await client.initialize()

        expect(client.getState()).toMatchObject({
          status: 'unavailable',
          authenticated: false,
          user: null,
        })
        expect(client.getState().error).toBeTruthy()
        expect(document.cookie).toContain('mol_auth=1')
      } finally {
        client.destroy()
      }
    },
  )

  it.each([401, 403])('still rejects a cookie-only session after %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(status)),
    )
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    try {
      await client.initialize()

      expect(client.getState().status).toBe('unauthenticated')
      expect(client.getAccessToken()).toBeNull()
      expect(document.cookie).not.toContain('mol_auth=1')
    } finally {
      client.destroy()
    }
  })

  it('keeps a Bearer-scheme candidate through the same 503', async () => {
    document.cookie = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(503)),
    )
    const { storage, token } = storedBearer()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    try {
      await client.initialize()

      expect(client.getState()).toMatchObject({
        status: 'unavailable',
        authenticated: false,
        user: null,
      })
      expect(client.getAccessToken()).toBe(token)
    } finally {
      client.destroy()
    }
  })
})
