import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const initializedClient = (
  config: Parameters<typeof createJWTAuthClient>[0] = {},
): ReturnType<typeof createJWTAuthClient> => createJWTAuthClient({ autoRefresh: false, ...config })

const login = async (client: ReturnType<typeof createJWTAuthClient>): Promise<unknown> => {
  await client.initialize()
  return client
    .login({ email: 'alice@example.com', password: 'login-input-not-the-fixture' })
    .catch((error: unknown) => error)
}

describe('round-six auth failure snapshots', () => {
  it('scrubs a mapAuthResponse throw before state, events and the caller retain it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'issued-token', user: { id: 'u1' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const original = new Error('mapper failed at /auth?token=mapper-secret&view=full')
    const client = initializedClient({
      mapAuthResponse: () => {
        throw original
      },
    })
    await client.initialize()
    const events: unknown[] = []
    client.addEventListener((event) => events.push(event))

    const caught = await client
      .login({ email: 'alice@example.com', password: 'login-input-not-the-fixture' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBe(original)
    expect((caught as Error).message).toBe('mapper failed at /auth?token=[REDACTED]&view=full')
    expect(client.getState().error).toBe('mapper failed at /auth?token=[REDACTED]&view=full')
    expect(JSON.stringify(events)).not.toContain('mapper-secret')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })

  it('scrubs response statusText on the retained auth HTTP view', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            statusText: '/auth?token=status-text-secret&view=full',
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const client = initializedClient()

    const caught = (await login(client)) as Error & {
      response?: { statusText?: string }
    }

    expect(caught.response?.statusText).toBe('/auth?token=[REDACTED]&view=full')
    expect(JSON.stringify(caught)).not.toContain('status-text-secret')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })

  it('reads a message accessor once and cannot restore a later-secret original', async () => {
    let reads = 0
    const original = new Error('placeholder')
    Object.defineProperty(original, 'message', {
      configurable: true,
      get() {
        reads++
        return reads === 1 ? 'offline' : '/auth?token=accessor-secret'
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(original)),
    )
    const client = initializedClient()
    await client.initialize()
    const events: unknown[] = []
    client.addEventListener((event) => events.push(event))

    const caught = await client
      .login({ email: 'alice@example.com', password: 'login-input-not-the-fixture' })
      .catch((error: unknown) => error)

    expect(reads).toBe(1)
    expect(caught).not.toBe(original)
    expect((caught as Error).message).toBe('offline')
    expect(client.getState().error).toBe('offline')
    expect(JSON.stringify(events)).not.toContain('accessor-secret')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })

  it('retains scrubbed non-enumerable AggregateError errors on a fresh rejection', async () => {
    const original = new AggregateError([new Error('/auth?token=aggregate-auth-secret')], 'offline')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(original)),
    )
    const client = initializedClient()

    const caught = (await login(client)) as Error & { errors?: Array<{ message?: string }> }

    expect(caught).not.toBe(original)
    expect(caught.errors).toEqual([expect.objectContaining({ message: '/auth?token=[REDACTED]' })])
    expect(JSON.stringify(caught)).not.toContain('aggregate-auth-secret')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })

  it('keeps diagnostic codes in a plain-object cause and rebuilds even a clean failure', async () => {
    const original = new TypeError('offline', { cause: { code: 'ENOTFOUND' } })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(original)),
    )
    const client = initializedClient()

    const caught = (await login(client)) as Error & {
      code?: string
      cause?: { code?: string }
    }

    expect(caught).not.toBe(original)
    expect(caught).toBeInstanceOf(TypeError)
    expect(caught.name).toBe('TypeError')
    expect(caught.cause?.code).toBe('ENOTFOUND')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })

  it('scrubs a credential header line thrown by auth mapping', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'issued-token', user: { id: 'u1' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const client = initializedClient({
      mapAuthResponse: () => {
        throw new Error('Authorization: Bearer auth-header-secret')
      },
    })

    const caught = await login(client)

    expect((caught as Error).message).toBe('Authorization: [REDACTED]')
    expect(client.getState().error).toBe('Authorization: [REDACTED]')
    expect(client.getState().loading).toBe(false)
    client.destroy()
  })
})
