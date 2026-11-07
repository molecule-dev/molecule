import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfigOptions } from '../types.js'

afterEach(() => vi.unstubAllGlobals())

/** Exercise the real client's serialization boundary, rather than calling an adapter in isolation. */
async function sentBody(
  config: AuthClientConfigOptions,
  kind: 'login' | 'register' = 'register',
): Promise<unknown> {
  const fetch = vi.fn(
    async (_url: string | URL | Request, _options?: RequestInit) =>
      new Response(JSON.stringify({ accessToken: 'token', user: { id: 'person' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetch)
  const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false, ...config })
  try {
    if (kind === 'login') await client.login({ email: 'a@example.com', password: 'secret' })
    else await client.register({ email: 'a@example.com', password: 'secret', name: 'A' })
    const options = fetch.mock.calls[0]?.[1] as RequestInit | undefined
    return JSON.parse(String(options?.body)) as unknown
  } finally {
    client.destroy()
  }
}

describe('payload-first auth request adapters', () => {
  it('wraps registration values with the natural one-argument callback', async () => {
    expect(await sentBody({ mapRequestBody: (data: unknown) => ({ user: data }) })).toEqual({
      user: { email: 'a@example.com', password: 'secret', name: 'A' },
    })
  })

  it('wraps login values with the same callback', async () => {
    expect(await sentBody({ mapRequestBody: (data) => ({ account: data }) }, 'login')).toEqual({
      account: { email: 'a@example.com', password: 'secret' },
    })
  })

  it.each(['login', 'register'] as const)('passes %s as optional second context', async (kind) => {
    const body = await sentBody(
      { mapRequestBody: (payload, operation) => ({ operation, payload }) },
      kind,
    )
    expect(body).toMatchObject({ operation: kind, payload: { email: 'a@example.com' } })
  })

  it('preserves the legacy callback including a kind-only adapter', async () => {
    expect(await sentBody({ requestBody: (kind) => ({ operation: kind }) })).toEqual({
      operation: 'register',
    })
  })

  it('preserves legacy callbacks whose default parameter changes function.length', async () => {
    expect(
      await sentBody({ requestBody: (kind, payload = {}) => ({ kind, user: payload }) }),
    ).toMatchObject({
      kind: 'register',
      user: { name: 'A' },
    })
  })

  it('gives the explicit payload-first adapter precedence without invoking the legacy one', async () => {
    const legacy = vi.fn(() => ({ legacy: true }))
    expect(
      await sentBody({ requestBody: legacy, mapRequestBody: (payload) => ({ member: payload }) }),
    ).toMatchObject({ member: { name: 'A' } })
    expect(legacy).not.toHaveBeenCalled()
  })

  it('leaves the default flat request unchanged', async () => {
    expect(await sentBody({})).toEqual({ email: 'a@example.com', password: 'secret', name: 'A' })
  })
})
