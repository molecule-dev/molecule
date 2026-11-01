import { afterEach, describe, expect, it, vi } from 'vitest'

import { createConsoleLogger, createRemoteTransport, redactCredentials } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-seven logger invariants', () => {
  it('keeps ordinary native stacks byte-for-byte', () => {
    const failure = new Error('offline')
    const stack = failure.stack
    expect(redactCredentials(failure).stack).toBe(stack)
  })

  it('keeps a safe custom stack accessor when message is accessor-backed', () => {
    const failure = new Error()
    const stack = 'Error: offline\n    at application (/safe/app.ts:4:2)'
    Object.defineProperty(failure, 'message', { get: () => 'offline', configurable: true })
    Object.defineProperty(failure, 'stack', { get: () => stack, configurable: true })
    expect(redactCredentials(failure).stack).toBe(stack)
  })

  it('does not re-enter an inherited message accessor through a native lazy stack', () => {
    let reads = 0
    class CustomError extends Error {
      get message() {
        reads++
        return 'offline'
      }
    }
    const failure = new CustomError()
    redactCredentials(failure)
    expect(reads).toBe(1)
  })

  it('closes r5 live serialization, Error.name, Map and header/form leaks', () => {
    const bodies: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: unknown, init: RequestInit) => {
        bodies.push(String(init.body))
        return Promise.resolve(new Response())
      }),
    )
    const transport = createRemoteTransport({
      url: 'https://logs.invalid',
      minLevel: 'debug',
      batchSize: 1,
    })
    const named = new Error('offline')
    named.name = '/auth?token=name-secret'
    transport({
      level: 'warn',
      timestamp: new Date(),
      message: 'failure',
      args: [
        { toJSON: () => ({ password: 'json-secret' }) },
        named,
        new Map([['Authorization', 'map-secret']]),
        'password=form-secret&flag',
        'Authorization: Bearer header-secret',
      ],
    })
    for (const secret of [
      'json-secret',
      'name-secret',
      'map-secret',
      'form-secret',
      'header-secret',
    ]) {
      expect(bodies.join('')).not.toContain(secret)
    }
  })

  it('closes r5 console namespace leak', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createConsoleLogger({ name: '/auth?token=namespace-secret' }).warn('failure')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('namespace-secret')
  })

  it('scrubs a URL in a symbol description before real logger transport emission', () => {
    const bodies: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: unknown, init: RequestInit) => {
        bodies.push(String(init.body))
        return Promise.resolve(new Response())
      }),
    )
    const transport = createRemoteTransport({
      url: 'https://logs.invalid',
      minLevel: 'debug',
      batchSize: 1,
    })
    transport({
      level: 'warn',
      timestamp: new Date(),
      message: 'failure',
      args: [Symbol('/auth?token=symbol-description-secret')],
    })
    expect(bodies.join('')).not.toContain('symbol-description-secret')
  })
})
