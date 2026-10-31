import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { createFetchClient, HttpError, setAuthGate } from '../index.js'

const LOG_URL = 'https://logs.example.test/r4'

const captureLogging = (answer: Response) => {
  const entries: LogEntry[] = []
  const remotePayloads: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === LOG_URL) {
        remotePayloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(answer)
    }),
  )
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const provider = createConsoleLoggerProvider('debug')
  provider.addTransport((entry) => entries.push(entry))
  provider.addTransport(createRemoteTransport({ url: LOG_URL, minLevel: 'debug', batchSize: 1 }))
  setProvider(provider)
  return { entries, remotePayloads }
}

const expectNoSecret = (outputs: unknown[], secret: string): void => {
  for (const output of outputs) {
    const serialized = typeof output === 'string' ? output : JSON.stringify(output)
    expect(serialized).not.toContain(secret)
  }
}

afterEach(() => {
  setAuthGate(null)
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-four credential leak reproductions', () => {
  it.each([
    ['auth_token', `/auth?auth_token=fetch-family-secret&view=full`],
    ['fragment session_token', `/auth#session_token=fetch-fragment-secret&view=full`],
    ['percent-encoded token', `/auth?%74oken=fetch-encoded-secret&view=full`],
  ])('redacts %s through the fetch error and real remote transport', async (_name, url) => {
    const secret = url.match(/=([^=&]+)/)?.[1]
    if (!secret) throw new Error('Expected a fixture credential')
    const { entries, remotePayloads } = captureLogging(
      new Response(JSON.stringify({ error: 'Unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const error = await createFetchClient({ retry: false })
      .get(url)
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect(remotePayloads).toHaveLength(1)
    expect((error as HttpError).config?.url).toContain('view=full')
    expectNoSecret([error, (error as HttpError).stack, entries, remotePayloads], secret)
  })

  it('redacts response credential headers and URL-bearing body values without changing safe data', async () => {
    const headerSecret = 'fetch-response-header-secret'
    const bodySecret = 'fetch-response-body-secret'
    const { entries, remotePayloads } = captureLogging(
      new Response(
        JSON.stringify({
          requestUrl: `/auth?token=${bodySecret}`,
          safe: { label: 'byte-for-byte', path: '/files/public&token=chapter/part.txt' },
        }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
            'x-auth-token': headerSecret,
            'x-request-id': 'request-safe-id',
          },
        },
      ),
    )

    const error = await createFetchClient({ retry: false })
      .get('/refresh')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    const response = (error as HttpError).response
    expect(response?.headers['x-request-id']).toBe('request-safe-id')
    expect(response?.data).toMatchObject({
      requestUrl: '/auth?token=[REDACTED]',
      safe: { label: 'byte-for-byte', path: '/files/public&token=chapter/part.txt' },
    })
    expectNoSecret([error, entries, remotePayloads], headerSecret)
    expectNoSecret([error, entries, remotePayloads], bodySecret)
  })

  it('does not rewrite token-like text in a path with no query or fragment', () => {
    const path = '/files/public&token=chapter/part.txt'
    expect(HttpError.redactUrlCredentials(path)).toBe(path)
  })
})
