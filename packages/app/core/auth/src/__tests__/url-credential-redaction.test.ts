import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  defaultFormat,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { isHttpError } from '../../../http/src/index.js'
import { createJWTAuthClient } from '../index.js'

const LOG_URL = 'https://logs.example.test/entries'

afterEach(() => {
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('auth URL credential redaction', () => {
  it('never sends an initial refresh URL credential through the remote logging transport', async () => {
    const refreshToken = 'refresh-body-secret-r3'
    const urlSecret = 'refresh-url-secret-r3'
    const refreshURL = `/auth/refresh?access_token=${urlSecret}&view=full`
    const accessToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })),
      btoa('access-token-secret-r3'),
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
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === LOG_URL) {
          remotePayloads.push(String(init?.body))
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        expect(String(input)).toBe(refreshURL)
        expect(init?.body).toBe(JSON.stringify({ refreshToken }))
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Refresh unavailable' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const entries: LogEntry[] = []
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport((entry) => entries.push(entry))
    provider.addTransport(createRemoteTransport({ url: LOG_URL, batchSize: 1 }))
    setProvider(provider)

    const client = createJWTAuthClient({
      storage,
      autoRefresh: false,
      refreshEndpoint: refreshURL,
    })
    await client.initialize()

    const warning = entries.find((entry) =>
      entry.message.startsWith('Initial token refresh failed'),
    )
    expect(warning).toBeDefined()
    const error = warning?.args[0]
    if (!isHttpError(error)) throw new Error('Expected the warning to carry the HTTP failure')
    expect(error.status).toBe(503)
    expect(error.response?.config.url).toContain('/auth/refresh?')
    expect(error.response?.config.url).toContain('view=full')
    expect(remotePayloads).toHaveLength(1)
    const outputs = [
      JSON.stringify(error),
      JSON.stringify(warning),
      defaultFormat(warning!),
      ...remotePayloads,
    ]
    for (const output of outputs) {
      expect(output).not.toContain(urlSecret)
      expect(output).not.toContain(refreshToken)
      expect(output).not.toContain(accessToken)
      expect(output).not.toContain('access-token-secret-r3')
    }
    client.destroy()
  })

  it('redacts a credential URL from a network failure warning and remote payload', async () => {
    const urlSecret = 'network-auth-url-secret'
    const refreshURL = `/auth/refresh?token=${urlSecret}&view=full`
    const accessToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })),
      btoa('network-access-token-secret'),
    ].join('.')
    const values = new Map<string, string>([
      ['molecule:auth:accessToken', accessToken],
      ['molecule:auth:refreshToken', 'network-refresh-body-secret'],
      ['molecule:auth:user', JSON.stringify({ id: 'u1', email: 'alice@example.com' })],
    ])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === LOG_URL) {
          remotePayloads.push(String(init?.body))
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        expect(String(input)).toBe(refreshURL)
        return Promise.reject(new TypeError(`Failed to fetch ${refreshURL}`))
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const entries: LogEntry[] = []
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport((entry) => entries.push(entry))
    provider.addTransport(createRemoteTransport({ url: LOG_URL, batchSize: 1 }))
    setProvider(provider)

    const client = createJWTAuthClient({
      storage,
      autoRefresh: false,
      refreshEndpoint: refreshURL,
    })
    await client.initialize()

    const warning = entries.find((entry) =>
      entry.message.startsWith('Initial token refresh failed'),
    )
    expect(warning).toBeDefined()
    expect(String(warning?.args[0])).toContain('view=full')
    expect(remotePayloads).toHaveLength(1)
    for (const output of [String(warning?.args[0]), JSON.stringify(warning), ...remotePayloads]) {
      expect(output).not.toContain(urlSecret)
      expect(output).not.toContain('network-refresh-body-secret')
      expect(output).not.toContain(accessToken)
    }
    client.destroy()
  })
})
