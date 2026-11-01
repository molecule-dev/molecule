import { afterEach, describe, expect, it, vi } from 'vitest'

import { createConsoleLogger, createRemoteTransport, redactCredentials } from '../index.js'
import type { LogEntry } from '../types.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const captureLogger = (): {
  entries: LogEntry[]
  logger: ReturnType<typeof createConsoleLogger>
} => {
  const entries: LogEntry[] = []
  return {
    entries,
    logger: createConsoleLogger({ transports: [(entry) => entries.push(entry)] }),
  }
}

describe('round-six snapshot credential reproductions', () => {
  it('materializes and scrubs toJSON output before the real remote transport serializes it', () => {
    const payloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        payloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }),
    )
    const transport = createRemoteTransport({
      url: 'https://logs.example.test/r6-to-json',
      minLevel: 'debug',
      batchSize: 1,
    })
    let reads = 0
    const argument = {
      toJSON() {
        reads++
        return { password: 'to-json-secret', safe: 'byte-for-byte' }
      },
    }

    transport({
      level: 'warn',
      message: 'failed',
      args: [argument],
      timestamp: new Date('2024-01-15T10:30:00.000Z'),
    })

    expect(reads).toBe(1)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).not.toContain('to-json-secret')
    expect(payloads[0]).toContain('[REDACTED]')
    expect(payloads[0]).toContain('byte-for-byte')
  })

  it('scrubs an Error name instead of trusting it as a diagnostic label', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { entries, logger } = captureLogger()
    const error = new Error('offline')
    error.name = '/auth?token=error-name-secret'

    logger.error('failed', error)

    const snapshot = entries[0]?.args[0] as Error
    expect(snapshot.name).toBe('/auth?token=[REDACTED]')
    expect(JSON.stringify(entries)).not.toContain('error-name-secret')
  })

  it('turns Map entries into data and classifies credential string keys', () => {
    const output = redactCredentials(
      new Map<unknown, unknown>([
        ['authorization', 'Bearer map-secret'],
        ['view', 'full'],
        [{ password: 'map-key-secret' }, 'safe'],
      ]),
    ) as unknown

    expect(output).toEqual([
      ['authorization', '[REDACTED]'],
      ['view', 'full'],
      [{ password: '[REDACTED]' }, 'safe'],
    ])
  })

  it('accepts bare and empty form segments and redacts credential header lines', () => {
    expect(redactCredentials('password=form-secret&flag&empty=&view=full')).toBe(
      'password=[REDACTED]&flag&empty=&view=full',
    )
    expect(
      redactCredentials('request failed\nAuthorization: Bearer header-secret\nX-Request-ID: abc'),
    ).toBe('request failed\nAuthorization: [REDACTED]\nX-Request-ID: abc')
  })

  it('snapshots non-enumerable AggregateError errors and diagnostic codes in plain causes', () => {
    const aggregate = new AggregateError(
      [new Error('/auth?token=aggregate-secret')],
      'several requests failed',
    )
    const aggregateOutput = redactCredentials(aggregate) as AggregateError
    expect(JSON.stringify(aggregateOutput)).not.toContain('aggregate-secret')
    expect(aggregateOutput.errors).toEqual([
      expect.objectContaining({ message: '/auth?token=[REDACTED]' }),
    ])

    const error = new Error('offline', { cause: { code: 'ENOTFOUND' } })
    const output = redactCredentials(error) as Error & { cause?: { code?: string } }
    expect(output.cause?.code).toBe('ENOTFOUND')
  })

  it('decodes textual binary once and marks non-text binary without retaining live bytes', () => {
    const bytes = new TextEncoder().encode('{"password":"binary-secret","safe":"same"}')
    expect(redactCredentials(bytes)).toBe('{"password":"[REDACTED]","safe":"same"}')
    expect(redactCredentials(new Uint8Array([0xff, 0xfe, 0xfd]))).toBe('[binary 3 bytes]')
  })

  it('represents a logged Blob as inert metadata and never writes native internals', async () => {
    const blob = new Blob(['{"safe":"same"}'], { type: 'application/json' })
    const output = redactCredentials(blob)

    expect(output).toBe('[Blob 15 bytes application/json]')
    await expect(blob.text()).resolves.toBe('{"safe":"same"}')
  })

  it('uses the scrubbed entry logger for the console prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    createConsoleLogger({ name: '/auth?token=console-prefix-secret' }).warn('failed')

    expect(warn).toHaveBeenCalledWith('[/auth?token=[REDACTED]]', 'failed')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('console-prefix-secret')
  })
})
