/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual pino.
 *
 * The unit suite (`index.test.ts`) mocks pino, so it can only validate OUR
 * assumptions about pino — not pino. That gap let a consumer-experience bug
 * ship unfelt: pino is printf-like and treats a non-string first argument as
 * the merging object, so the old "pass the raw args array through" bridge
 * turned the core docs' own `logger.info('Server started on port', 3000)`
 * into a message-less `{"0":…,"1":3000}` record, and serialized secondary
 * `Error`s to `{}` (message AND stack lost). These tests pin the bridge's
 * behavior against the real library via an in-process destination sink.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { Logger } from '@molecule/api-logger'

import { createLogger } from '../provider.js'

/** A synchronous in-process sink capturing pino's serialized records. */
const makeSink = (): { logger: Logger; records: () => Array<Record<string, unknown>> } => {
  const lines: string[] = []
  const logger = createLogger({
    level: 'trace',
    destination: { write: (msg: string) => void lines.push(msg) },
  })
  return {
    logger,
    records: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>),
  }
}

describe('@molecule/api-logger-pino × REAL pino', () => {
  it("CONSUMER PROPERTY: the core docs' own example calls survive the bridge", () => {
    const { logger, records } = makeSink()

    // Every one of these appears verbatim in @molecule/api-logger's module docs.
    logger.info('Server started on port', 3000)
    logger.debug('Request received', { method: 'GET', path: '/api' })
    logger.warn('Rate limit approaching')

    const [started, request, rate] = records()
    // The old bridge produced {"0":"Server started on port","1":3000} with NO msg.
    expect(started.msg).toBe('Server started on port 3000')
    expect(started['0']).toBeUndefined()

    // (message, context object) must keep the structure pino exists for.
    expect(request.msg).toBe('Request received')
    expect(request.method).toBe('GET')
    expect(request.path).toBe('/api')

    expect(rate.msg).toBe('Rate limit approaching')
  })

  it('FAILURE DISAMBIGUATION: two different errors stay distinguishable (message + stack survive)', () => {
    const { logger, records } = makeSink()
    const dbDown = new Error('connection refused')
    const cacheMiss = new Error('cache miss storm')

    // The core-docs pattern: message first, Error second.
    logger.error('Database connection failed', dbDown)
    logger.error('Cache degraded', cacheMiss)

    const [first, second] = records() as Array<{
      msg: string
      err?: { message?: string; stack?: string }
    }>
    // The old bridge serialized both Errors to {} — indistinguishable failures.
    expect(first.msg).toBe('Database connection failed')
    expect(first.err?.message).toBe('connection refused')
    expect(first.err?.stack).toContain('connection refused')

    expect(second.msg).toBe('Cache degraded')
    expect(second.err?.message).toBe('cache miss storm')
    // A triaging caller (or executor) can tell the two failures apart.
    expect(first.err?.message).not.toBe(second.err?.message)
  })

  it('pino-native call shapes pass straight through', () => {
    const { logger, records } = makeSink()
    const err = new Error('boom')

    logger.error(err) // single Error
    logger.error(err, 'wrapped message') // (err, msg)
    logger.info({ requestId: 'r-1' }, 'with context') // (obj, msg)

    const [solo, wrapped, ctx] = records() as Array<{
      msg?: string
      requestId?: string
      err?: { message?: string; stack?: string }
    }>
    expect(solo.err?.message).toBe('boom')
    expect(wrapped.msg).toBe('wrapped message')
    expect(wrapped.err?.stack).toContain('boom')
    expect(ctx.msg).toBe('with context')
    expect(ctx.requestId).toBe('r-1')
  })

  it('level mapping is faithful: each molecule level lands on the matching pino level number', () => {
    const { logger, records } = makeSink()

    logger.trace('t')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(records().map((r) => r.level)).toEqual([10, 20, 30, 40, 50])
  })

  it("a 'silent' bond-side gate emits nothing (the caller opted into double-gating)", () => {
    const lines: string[] = []
    const logger = createLogger({
      level: 'silent',
      destination: { write: (msg: string) => void lines.push(msg) },
    })

    logger.error('must not appear')

    expect(lines).toEqual([])
  })

  it('CONSUMER PROPERTY: wired through the core, the default info gate still applies once', async () => {
    // Full lifecycle: setLogger(bond) → core logger call → real pino record.
    const { logger: pinoLogger, records } = makeSink()
    const { logger, resetLogger, setLevel, setLogger } = await import('@molecule/api-logger')

    try {
      setLogger(pinoLogger)
      setLevel('info')

      logger.debug('filtered by the core gate') // below 'info' → dropped by the core
      logger.info('passes the core gate')

      const recs = records()
      expect(recs).toHaveLength(1)
      expect(recs[0].msg).toBe('passes the core gate')

      // Raising the core gate is the ONLY knob a consumer must touch:
      // the bond instance passes trace through, so debug now appears.
      setLevel('debug')
      logger.debug('visible after core setLevel')
      expect(records()).toHaveLength(2)
    } finally {
      setLevel('info')
      resetLogger()
    }
  })
})
