import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  defaultFormat,
  getLogger,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { createFetchClient, HttpError, setAuthGate } from '../index.js'

const LOG_URL = 'https://logs.example.test/entries'

const captureLogging = (answer: Response | Error) => {
  const entries: LogEntry[] = []
  const remotePayloads: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === LOG_URL) {
        remotePayloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)
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

const serializedOutputs = (
  error: HttpError,
  entries: LogEntry[],
  remotePayloads: string[],
): string[] => [
  JSON.stringify(error),
  String(error),
  defaultFormat({ level: 'error', message: error.message, args: [error], timestamp: new Date() }),
  ...entries.flatMap((entry) => [JSON.stringify(entry), defaultFormat(entry)]),
  ...remotePayloads,
]

const expectNoSecrets = (outputs: string[], secrets: string[]): void => {
  for (const output of outputs) {
    for (const secret of secrets) expect(output).not.toContain(secret)
  }
}

afterEach(() => {
  setAuthGate(null)
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('URL credential redaction', () => {
  it('redacts userinfo and credential query parameters on a non-OK response and its logs', async () => {
    const secrets = [
      'url-user-secret',
      'url-pass-secret',
      'url-access-secret',
      'url-token-secret',
      'url-refresh-secret',
      'url-code-secret',
      'url-password-secret',
      'url-api-secret',
    ]
    const userinfo = 'url-user-secret:url-pass-secret'
    const url =
      `https://${userinfo}@example.test/auth/refresh` +
      '?access_token=url-access-secret&token=url-token-secret' +
      '&refresh_token=url-refresh-secret&code=url-code-secret' +
      '&password=url-password-secret&api_key=url-api-secret&view=full'
    const { entries, remotePayloads } = captureLogging(
      new Response(JSON.stringify({ error: 'Unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const error = await createFetchClient({ retry: false })
      .get(url)
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.status).toBe(503)
    expect(remotePayloads).toHaveLength(1)
    expect(error.config?.url).toContain('/auth/refresh?')
    expect(error.config?.url).toContain('view=full')
    expect(error.response?.config.url).toBe(error.config?.url)
    expectNoSecrets(serializedOutputs(error, entries, remotePayloads), secrets)
  })

  it('redacts a credential URL from a malformed-response error and remote log entry', async () => {
    const secret = 'malformed-url-token-secret'
    const url = `/auth/refresh?token=${secret}&view=full`
    const { entries, remotePayloads } = captureLogging(
      new Response('<html>Not JSON</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )

    const error = await createFetchClient({ retry: false })
      .get(url)
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    getLogger('url-redaction-test').warn('Malformed response', error)
    expect(remotePayloads).toHaveLength(1)
    expect(error.message).toContain('/auth/refresh?')
    expect(error.message).toContain('view=full')
    expect(error.config?.url).toContain('view=full')
    expectNoSecrets(serializedOutputs(error, entries, remotePayloads), [secret])
  })

  it('redacts a credential URL from a network error, its message and remote log arguments', async () => {
    const secret = 'network-url-password-secret'
    const url = `https://example.test/auth/refresh?password=${secret}&view=full`
    const { entries, remotePayloads } = captureLogging(new TypeError(`Failed to fetch ${url}`))

    const error = await createFetchClient({ retry: false })
      .get(url)
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.status).toBe(0)
    expect(remotePayloads).toHaveLength(1)
    expect(error.message).toContain('/auth/refresh?')
    expect(error.message).toContain('view=full')
    expect(error.config?.url).toContain('view=full')
    expectNoSecrets(serializedOutputs(error, entries, remotePayloads), [secret])
  })

  it('redacts a credential URL from the stalled auth-gate report', async () => {
    vi.useFakeTimers()
    const secret = 'auth-gate-url-secret'
    captureLogging(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    setAuthGate(() => new Promise<void>(() => {}))

    const request = createFetchClient({ retry: false }).get(
      `/auth/refresh?access_token=${secret}&view=full`,
    )
    await vi.advanceTimersByTimeAsync(3_000)
    await request

    const logged = vi.mocked(console.error).mock.calls.flat().map(String).join(' ')
    expect(logged).toContain('view=full')
    expectNoSecrets([logged], [secret])
  })

  it('logs a URL without credentials unchanged', async () => {
    const url = 'https://example.test/projects/p1?view=full&page=2'
    const { entries, remotePayloads } = captureLogging(
      new Response(JSON.stringify({ error: 'Missing' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const error = await createFetchClient({ retry: false })
      .get(url)
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.config?.url).toBe(url)
    expect(error.response?.config.url).toBe(url)
    expect(JSON.stringify(entries)).toContain(url)
    expect(remotePayloads.join('\n')).toContain(url)
  })
})

describe('error interceptor notification context', () => {
  const notificationInterceptor =
    (notify: () => void) =>
    (error: HttpError): HttpError => {
      const ownsError = error.config?.options?.molSilentErrorNotification === true
      const ownsRateLimit = error.config?.options?.molSilentRateLimitNotification === true
      const body = error.response?.data as { limitType?: string } | undefined
      if (error.status === 429 && !body?.limitType && !ownsRateLimit) notify()
      if (error.status >= 500 && !ownsError) notify()
      return error
    }

  it.each([
    {
      name: 'silentErrors()',
      status: 503,
      options: { molSilentErrorNotification: true },
    },
    {
      name: 'silentErrorsAndRateLimit()',
      status: 429,
      options: {
        molSilentErrorNotification: true,
        molSilentRateLimitNotification: true,
      },
    },
  ])('keeps $name failures out of global notifications', async ({ status, options }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Failure' }), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const notify = vi.fn()
    const client = createFetchClient({ retry: false })
    client.addErrorInterceptor(notificationInterceptor(notify))

    // The request rejects; the caller owns that error — asserted here so the
    // rejection is not silently dropped.
    await expect(client.get('/caller-owns-this-error', { options })).rejects.toThrow()

    expect(notify).toHaveBeenCalledTimes(0)
  })

  it('still notifies for a failure without a suppression option', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Failure' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const notify = vi.fn()
    const client = createFetchClient({ retry: false })
    client.addErrorInterceptor(notificationInterceptor(notify))

    // The request rejects; the caller owns that error — asserted here so the
    // rejection is not silently dropped.
    await expect(client.get('/ordinary-error')).rejects.toThrow()

    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('keeps only the two boolean notification controls, never bodies, headers or other options', async () => {
    const secrets = ['context-body-secret', 'context-header-secret', 'context-option-secret']
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Failure' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )
    const client = createFetchClient({ retry: false })

    const error = await client
      .post(
        '/caller-owns-this-error',
        { password: secrets[0] },
        {
          headers: { Authorization: `Bearer ${secrets[1]}` },
          options: {
            molSilentErrorNotification: true,
            molSilentRateLimitNotification: false,
            providerCredential: secrets[2],
          },
        },
      )
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.config?.options).toStrictEqual({ molSilentErrorNotification: true })
    expect(error.response?.config.options).toStrictEqual({ molSilentErrorNotification: true })
    expectNoSecrets([JSON.stringify(error)], secrets)
  })
})
