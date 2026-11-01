import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createConsoleLogger } from '../index.js'

describe('console error arguments', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes an error after the message to the console as a scrubbed, detached Error', () => {
    const secret = 'console-argument-secret'
    const original = new Error(`register failed for https://user:${secret}@example.test/sw.js`)
    const entries: unknown[] = []
    const logger = createConsoleLogger({ transports: [(entry) => entries.push(entry)] })

    logger.error('Service worker registration failed:', original)

    const [message, output] = vi.mocked(console.error).mock.calls[0] as [string, Error]
    expect(message).toBe('Service worker registration failed:')
    expect(output).toBeInstanceOf(Error)
    expect(output).not.toBe(original)
    expect(output.name).toBe('Error')
    expect(output.message).toContain('register failed for')
    expect(output.message).not.toContain(secret)
    expect(String(output.stack)).not.toContain(secret)
    expect(JSON.stringify(entries)).not.toContain(secret)
  })

  it('rebuilds every error argument and leaves plain data as data', () => {
    const logger = createConsoleLogger({ level: 'warn' })
    const first = new Error('first failure')
    const native = new DOMException('blocked', 'SecurityError')

    logger.warn('two failures', first, { detail: 'kept' }, native)

    const [, a, data, b] = vi.mocked(console.warn).mock.calls[0] as [string, Error, object, Error]
    expect(a).toBeInstanceOf(Error)
    expect(a.message).toBe('first failure')
    expect(data).not.toBeInstanceOf(Error)
    expect(data).toEqual({ detail: 'kept' })
    expect(b).toBeInstanceOf(Error)
    expect(b).not.toBeInstanceOf(DOMException)
    expect(b.name).toBe('SecurityError')
  })

  it('keeps an error-first call reading its message from the error', () => {
    const logger = createConsoleLogger()

    logger.error(new Error('error first'))

    const [message, output] = vi.mocked(console.error).mock.calls[0] as [string, Error]
    expect(message).toBe('error first')
    expect(output).toBeInstanceOf(Error)
  })
})
