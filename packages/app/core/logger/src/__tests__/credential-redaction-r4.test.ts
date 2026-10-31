import { afterEach, describe, expect, it, vi } from 'vitest'

import { createConsoleLogger, createRemoteTransport, redactCredentials } from '../index.js'
import type { LogEntry } from '../types.js'

const LOG_URL = 'https://logs.example.test/logger-r4'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('logger credential emission boundaries', () => {
  it('scrubs a direct remote transport entry, nested errors, headers and encoded URL names', () => {
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(LOG_URL)
        remotePayloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }),
    )
    const transport = createRemoteTransport({ url: LOG_URL, minLevel: 'debug', batchSize: 1 })
    const userinfoSecret = 'logger-userinfo-secret'
    const error = new Error('request /auth?%74oken=logger-url-secret failed', {
      cause: new Error(`https://user:${userinfoSecret}@example.test/auth`),
    })
    const entry: LogEntry = {
      level: 'warn',
      message: 'failed /auth#session_token=logger-fragment-secret',
      args: [error, { headers: { 'X-Auth-Token': 'logger-header-secret' } }],
      timestamp: new Date(),
      context: { safePath: '/files/public&token=chapter/part.txt' },
    }

    transport(entry)

    expect(remotePayloads).toHaveLength(1)
    for (const secret of [
      'logger-url-secret',
      userinfoSecret,
      'logger-fragment-secret',
      'logger-header-secret',
    ]) {
      expect(remotePayloads[0]).not.toContain(secret)
    }
    expect(remotePayloads[0]).toContain('/files/public&token=chapter/part.txt')
  })

  it('uses the same rule for console output and custom transports', () => {
    const entries: LogEntry[] = []
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createConsoleLogger({
      level: 'warn',
      transports: [(entry) => entries.push(entry)],
    })
    const consoleSecret = 'logger-console-secret'
    const error = new Error(`gate failed for https://user:${consoleSecret}@example.test/auth`)

    logger.warn('The auth gate rejected', { error, safe: '/public?view=full' })

    const consoleOutput = JSON.stringify(
      vi.mocked(console.warn).mock.calls,
      (_key, value: unknown) =>
        value instanceof Error ? { message: value.message, stack: value.stack } : value,
    )
    expect(consoleOutput).not.toContain(consoleSecret)
    expect(JSON.stringify(entries)).not.toContain(consoleSecret)
    expect(consoleOutput).toContain('/public?view=full')
  })

  it.each([
    'token',
    'auth',
    'session',
    'secret',
    'password',
    'passwd',
    'key',
    'code',
    'signature',
    'sig',
    'jwt',
    'bearer',
    'credential',
  ])('recognizes %s as a decoded URL/object credential-name family', (family) => {
    const input = {
      nested: { [`x-${family}-value`]: 'family-object-secret' },
      url: `/auth?${family}=family-url-secret&view=full`,
      monkey: 'safe-monkey',
      keyboard: 'safe-keyboard',
      tokenized: 'safe-tokenized',
      withCredentials: false,
      errorKey: 'auth.error.requestFailed',
      i18nKey: 'auth.error.requestFailed',
      errorCode: 'request_failed',
    }

    const output = redactCredentials(input)

    expect(JSON.stringify(output)).not.toContain('family-object-secret')
    expect(JSON.stringify(output)).not.toContain('family-url-secret')
    expect(output).toMatchObject({
      monkey: 'safe-monkey',
      keyboard: 'safe-keyboard',
      tokenized: 'safe-tokenized',
      withCredentials: false,
      errorKey: 'auth.error.requestFailed',
      i18nKey: 'auth.error.requestFailed',
      errorCode: 'request_failed',
    })
    expect(output.url).toContain('view=full')
  })

  it('walks cycles without overflowing into a fresh tree, including for clean input', () => {
    const input: { self?: unknown; nested: { password: string }; safe: string } = {
      nested: { password: 'cycle-secret' },
      safe: 'unchanged',
    }
    input.self = input

    const output = redactCredentials(input)

    expect(output).not.toBe(input)
    expect(output.self).toBe('[Circular]')
    expect(output.safe).toBe('unchanged')
    expect(JSON.stringify(output.nested)).not.toContain('cycle-secret')
    const clean: { self?: unknown; safe: string } = { safe: 'unchanged' }
    clean.self = clean
    const cleanOutput = redactCredentials(clean)
    expect(cleanOutput).not.toBe(clean)
    expect(cleanOutput.self).toBe('[Circular]')
    expect(cleanOutput.safe).toBe('unchanged')
  })
})
