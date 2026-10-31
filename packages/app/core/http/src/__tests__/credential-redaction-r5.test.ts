import { afterEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/app-bond'
import type { Logger, LoggerProvider } from '@molecule/app-logger'

import { createFetchClient, HttpError } from '../index.js'

const unavailable = (body: string, contentType = 'application/json'): Response =>
  new Response(body, {
    status: 422,
    headers: { 'content-type': contentType },
  })

afterEach(() => {
  unbond('app-logger')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-five HTTP credential reproductions', () => {
  it('redacts a failed request URL before a directly bonded custom logger can emit it', async () => {
    const calls: unknown[][] = []
    const write = (values: unknown[]): void => {
      calls.push(values)
    }
    const logger: Logger = {
      trace: (message, ...args) => write([message, ...args]),
      debug: (message, ...args) => write([message, ...args]),
      info: (message, ...args) => write([message, ...args]),
      warn: (message, ...args) => write([message, ...args]),
      error: (message, ...args) => write([message, ...args]),
      setLevel: () => {},
      getLevel: () => 'debug',
      child: () => logger,
      withContext: () => logger,
      addTransport: () => () => {},
      removeTransport: () => {},
    }
    const provider: LoggerProvider = {
      getLogger: () => logger,
      createLogger: () => logger,
      setLevel: () => {},
      getLevel: () => 'debug',
      addTransport: () => () => {},
      enable: () => {},
      disable: () => {},
      isEnabled: () => true,
    }
    bond('app-logger', provider)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(unavailable('{"error":"Unavailable"}'))),
    )

    const error = await createFetchClient({ retry: false })
      .get('/auth?token=custom-logger-secret&view=full')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect(JSON.stringify(calls)).not.toContain('custom-logger-secret')
    expect(JSON.stringify(calls)).toContain('view=full')
  })

  it('scrubs a serialized JSON credential retained for responseType text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          unavailable('{"password":"http-text-secret","safe":"byte-for-byte"}', 'text/plain'),
        ),
      ),
    )

    const error = await createFetchClient({ retry: false })
      .get('/text', { responseType: 'text' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).response?.data).toBe(
      '{"password":"[REDACTED]","safe":"byte-for-byte"}',
    )
    expect(JSON.stringify(error)).not.toContain('http-text-secret')
  })

  it('lets the app read a 422 validation map byte-for-byte', async () => {
    const sent = {
      errors: {
        password: ['is too short'],
        email: ['is invalid'],
      },
    }
    const serialized = JSON.stringify(sent)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(unavailable(serialized))),
    )

    const error = await createFetchClient({ retry: false })
      .post('/register', { email: 'alice@example.com' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    const body = (error as HttpError).response?.data as typeof sent
    expect(body.errors).toStrictEqual(sent.errors)
    expect(JSON.stringify(body)).toBe(serialized)
  })

  it('keeps clean serialized text and token-like path bytes exact', async () => {
    const text = '{ "message": "same bytes", "path": "/files/public&token=chapter/part.txt" }'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(unavailable(text, 'text/plain'))),
    )

    const error = await createFetchClient({ retry: false })
      .get('/text', { responseType: 'text' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).response?.data).toBe(text)
  })
})
