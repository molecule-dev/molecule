import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

const LOG_URL = 'https://logs.example.test/gate-r4'

const errorJSON = (value: unknown): string =>
  JSON.stringify(value, (_key, nested: unknown) =>
    nested instanceof Error ? { message: nested.message, stack: nested.stack } : nested,
  )

afterEach(async () => {
  const { setAuthGate } = await import('../index.js')
  setAuthGate(null)
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rejected auth gate credential redaction', () => {
  it.each([
    ['a rejection string', '/auth?token=gate-string-secret'],
    ['an Error and its stack', new Error('restore failed for /auth?token=gate-error-secret')],
  ])('sanitizes %s before console and real remote logging', async (_name, rejection) => {
    const secret = typeof rejection === 'string' ? 'gate-string-secret' : 'gate-error-secret'
    const entries: LogEntry[] = []
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === LOG_URL) {
          remotePayloads.push(String(init?.body))
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport((entry) => entries.push(entry))
    provider.addTransport(createRemoteTransport({ url: LOG_URL, batchSize: 1 }))
    setProvider(provider)
    // The gate captures its logger at module evaluation, so import it only after
    // bonding the real remote transport under test.
    const { createFetchClient, setAuthGate } = await import('../index.js')
    setAuthGate(() => Promise.reject(rejection))

    await createFetchClient({ retry: false }).get('/feed')

    expect(remotePayloads).toHaveLength(1)
    for (const output of [
      errorJSON(vi.mocked(console.warn).mock.calls),
      errorJSON(entries),
      ...remotePayloads,
    ]) {
      expect(output).not.toContain(secret)
    }
  })
})
