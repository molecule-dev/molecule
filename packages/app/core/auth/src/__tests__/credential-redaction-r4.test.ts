import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { isHttpError } from '../../../http/src/index.js'
import { createJWTAuthClient } from '../index.js'

const LOG_URL = 'https://logs.example.test/auth-r4'

afterEach(() => {
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-four auth credential leaks', () => {
  it('sanitizes a native fetch rejection before login state, events and rethrow', async () => {
    const secret = 'native-userinfo-secret'
    const baseURL = `https://login:${secret}@example.test`
    const native = new TypeError(`Failed to parse URL from ${baseURL}/auth/login`)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(native)),
    )
    const client = createJWTAuthClient({ baseURL, autoRefresh: false })
    await client.initialize()
    const events: unknown[] = []
    client.addEventListener((event) => events.push(event))

    const error = await client
      .login({ email: 'alice@example.com', password: 'not-the-fixture-secret' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(TypeError)
    expect(error).not.toBe(native)
    expect((error as Error).name).toBe('TypeError')
    expect((error as Error).stack).toBeDefined()
    expect(isHttpError(error)).toBe(false)
    const outputs = [
      (error as Error).message,
      (error as Error).stack,
      client.getState().error,
      JSON.stringify(events),
    ]
    for (const output of outputs) expect(output).not.toContain(secret)
    client.destroy()
  })

  it('scrubs a 503 response header and body through initial refresh and the real remote transport', async () => {
    const headerSecret = 'auth-response-header-secret'
    const bodySecret = 'auth-response-body-secret'
    const refreshToken = 'auth-refresh-body-secret-r4'
    const accessToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })),
      btoa('auth-access-token-secret-r4'),
    ].join('.')
    const values = new Map<string, string>([
      ['molecule:auth:accessToken', accessToken],
      ['molecule:auth:refreshToken', refreshToken],
      ['molecule:auth:user', JSON.stringify({ id: 'u1', email: 'alice@example.com' })],
    ])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
    const entries: LogEntry[] = []
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === LOG_URL) {
          remotePayloads.push(String(init?.body))
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        expect(String(input)).toBe('/auth/refresh')
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'Refresh unavailable',
              requestUrl: `/auth?token=${bodySecret}`,
              safe: { label: 'byte-for-byte', path: '/files/public&token=chapter/part.txt' },
            }),
            {
              status: 503,
              headers: {
                'content-type': 'application/json',
                'x-auth-token': headerSecret,
                'x-request-id': 'auth-request-safe-id',
              },
            },
          ),
        )
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport((entry) => entries.push(entry))
    provider.addTransport(createRemoteTransport({ url: LOG_URL, batchSize: 1 }))
    setProvider(provider)
    const client = createJWTAuthClient({ storage, autoRefresh: false })

    await client.initialize()

    const warning = entries.find((entry) =>
      entry.message.startsWith('Initial token refresh failed'),
    )
    expect(warning).toBeDefined()
    const error = warning?.args[0]
    if (!isHttpError(error)) throw new Error('Expected the initial refresh HttpError')
    expect(error.response?.headers['x-request-id']).toBe('auth-request-safe-id')
    expect(error.response?.data).toMatchObject({
      requestUrl: '/auth?token=[REDACTED]',
      safe: { label: 'byte-for-byte', path: '/files/public&token=chapter/part.txt' },
    })
    expect(remotePayloads).toHaveLength(1)
    for (const output of [JSON.stringify(error), JSON.stringify(warning), ...remotePayloads]) {
      expect(output).not.toContain(headerSecret)
      expect(output).not.toContain(bodySecret)
      expect(output).not.toContain(refreshToken)
      expect(output).not.toContain(accessToken)
    }
    client.destroy()
  })
})
