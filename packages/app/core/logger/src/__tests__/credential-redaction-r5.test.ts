import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRemoteTransport, redactCredentials } from '../index.js'
import type { LogEntry } from '../types.js'

const LOG_URL = 'https://logs.example.test/logger-r5'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-five credential graph reproductions', () => {
  it.each(['accesstoken', 'refreshtoken', 'idtoken', 'clientsecret'])(
    'retains the compact %s credential alias',
    (name) => {
      const output = redactCredentials({
        url: `/oauth?${name}=compact-alias-secret&view=full`,
      })

      expect(output.url).toBe(`/oauth?${name}=[REDACTED]&view=full`)
    },
  )

  it('scrubs shared references independently, breaks cycles, and never restores input identity', () => {
    const shared = { token: 'shared-reference-secret' }
    const input: {
      a: typeof shared
      b: { x: typeof shared }
      self?: unknown
    } = { a: shared, b: { x: shared } }
    input.self = input

    const output = redactCredentials(input)

    expect(output.a.token).toBe('[REDACTED]')
    expect(output.b.x.token).toBe('[REDACTED]')
    expect(output.a).not.toBe(shared)
    expect(output.b.x).not.toBe(shared)
    expect(output.b.x).not.toBe(output.a)
    expect(output.self).toBe('[Circular]')
    expect(shared.token).toBe('shared-reference-secret')
    const clean = { safe: 'byte-for-byte' }
    const cleanOutput = redactCredentials(clean)
    expect(cleanOutput).toEqual(clean)
    expect(cleanOutput).not.toBe(clean)
  })

  it('does not invoke credential accessors and safely materializes every other accessor', () => {
    let credentialReads = 0
    let safeReads = 0
    const input = {
      get password(): string {
        credentialReads++
        return 'credential-accessor-secret'
      },
      get requestUrl(): string {
        safeReads++
        return '/auth?token=nested-accessor-secret'
      },
      get broken(): string {
        safeReads++
        throw new Error('getter failed')
      },
      get safe(): string {
        safeReads++
        return 'byte-for-byte'
      },
    }

    const output = redactCredentials(input)

    expect(credentialReads).toBe(0)
    expect(safeReads).toBe(3)
    expect(output.password).toBe('[REDACTED]')
    expect(output.requestUrl).toBe('/auth?token=[REDACTED]')
    expect(output.broken).toBe('[ACCESSOR_ERROR]')
    expect(output.safe).toBe('byte-for-byte')
  })

  it('exempts identifier names without exempting their values', () => {
    const output = redactCredentials({
      errorCode: '/auth?token=error-code-secret',
      errorKey: { password: 'error-key-secret' },
      statusCode: 'request_failed',
    })

    expect(output.errorCode).toBe('/auth?token=[REDACTED]')
    expect(output.errorKey).toEqual({ password: '[REDACTED]' })
    expect(output.statusCode).toBe('request_failed')
  })

  it('captures a scrubbed remote-buffer copy before later caller mutation', () => {
    const payloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        payloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }),
    )
    const transport = createRemoteTransport({
      url: LOG_URL,
      minLevel: 'debug',
      batchSize: 2,
    })
    const context: Record<string, unknown> = { safe: 'byte-for-byte' }
    const entry: LogEntry = {
      level: 'warn',
      message: 'initially clean',
      args: [],
      context,
      timestamp: new Date('2024-01-15T10:30:00.000Z'),
    }

    transport(entry)
    context.password = 'buffer-mutation-secret'
    transport({ ...entry, message: 'flush', context: { safe: true } })

    expect(payloads).toHaveLength(1)
    expect(payloads[0]).not.toContain('buffer-mutation-secret')
    expect(payloads[0]).toContain('byte-for-byte')
  })

  it('preserves validation-message shapes and diagnostic codes but redacts credential fields elsewhere', () => {
    const validation = {
      errors: {
        password: ['is too short'],
        email: ['is invalid'],
      },
    }
    const output = redactCredentials(validation)
    expect(output).toStrictEqual(validation)
    expect(output).not.toBe(validation)
    expect(redactCredentials({ password: 'outside-secret' }).password).toBe('[REDACTED]')
    expect(redactCredentials({ password: ['outside-secret'] }).password).toBe('[REDACTED]')

    const cause = Object.assign(new Error('connect failed'), { code: 'ENOTFOUND' })
    const error = new Error('request failed', { cause })
    const scrubbed = redactCredentials(error) as Error & {
      cause?: Error & { code?: string }
    }
    expect(scrubbed.cause?.code).toBe('ENOTFOUND')
    expect(redactCredentials({ url: '/oauth?code=oauth-secret' }).url).toBe(
      '/oauth?code=[REDACTED]',
    )
  })

  it('rebuilds a credential-bearing native error as a readable plain Error', () => {
    const native = new DOMException(
      'request https://user:native-dom-secret@example.test/auth failed',
      'SecurityError',
    )

    const output = redactCredentials(native)

    expect(output).toBeInstanceOf(Error)
    expect(output).not.toBeInstanceOf(DOMException)
    expect(output.name).toBe('SecurityError')
    expect(output.message).not.toContain('native-dom-secret')
    expect(String(output.stack)).not.toContain('native-dom-secret')
    expect(native.message).toContain('native-dom-secret')
  })

  it('scrubs JSON, form and URL strings while preserving clean text bytes', () => {
    expect(redactCredentials('{"password":"json-body-secret","safe":"same"}')).toBe(
      '{"password":"[REDACTED]","safe":"same"}',
    )
    expect(redactCredentials('password=form-body-secret&email=alice%40example.test')).toBe(
      'password=[REDACTED]&email=alice%40example.test',
    )
    expect(redactCredentials('/auth?token=url-body-secret&view=full')).toBe(
      '/auth?token=[REDACTED]&view=full',
    )
    const clean = '{ "message": "same bytes", "path": "/files/public&token=chapter/part.txt" }'
    expect(redactCredentials(clean)).toBe(clean)
  })
})
