/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual winston.
 *
 * The unit suite (`index.test.ts`) mocks winston, so it can only validate OUR
 * assumptions about winston — not winston. That gap let a consumer-experience
 * bug ship unfelt: the old bridge stringified every argument, so the core
 * docs' own `logger.debug('Request received', { method: 'GET' })` printed
 * `Request received [object Object]` and `logger.error('failed', error)`
 * dropped the stack — even though the JSON format declares
 * `errors({ stack: true })`. These tests pin the bridge against the real
 * library via an in-process stream transport.
 *
 * @module
 */

import { Writable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import type { Logger, LogLevel } from '@molecule/api-logger'

import { createLogger } from '../provider.js'

/** A synchronous in-process sink capturing winston's serialized JSON records. */
const makeSink = (
  level: LogLevel = 'trace',
): { logger: Logger; records: () => Array<Record<string, unknown>> } => {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk))
      callback()
    },
  })
  const logger = createLogger({
    level,
    format: 'json',
    transports: [{ type: 'stream', options: { stream } }],
  })
  return {
    logger,
    records: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>),
  }
}

describe('@molecule/api-logger-winston × REAL winston', () => {
  it("CONSUMER PROPERTY: the core docs' own example calls survive the bridge", () => {
    const { logger, records } = makeSink()

    logger.info('Server started on port', 3000)
    logger.debug('Request received', { method: 'GET', path: '/api' })
    logger.warn('Rate limit approaching')

    const [started, request, rate] = records()
    expect(started.message).toBe('Server started on port 3000')

    // The old bridge printed 'Request received [object Object]'.
    expect(request.message).toBe('Request received')
    expect(request.method).toBe('GET')
    expect(request.path).toBe('/api')

    expect(rate.message).toBe('Rate limit approaching')
    expect(rate.level).toBe('warn')
  })

  it('FAILURE DISAMBIGUATION: two different errors stay distinguishable (message + stack survive)', () => {
    const { logger, records } = makeSink()
    const dbDown = new Error('connection refused')
    const cacheMiss = new Error('cache miss storm')

    logger.error('Database connection failed', dbDown)
    logger.error('Cache degraded', cacheMiss)

    const [first, second] = records() as Array<{ message: string; stack?: string }>
    // The old bridge collapsed both to `String(err)` — stacks gone, causes blurred.
    expect(first.message).toContain('Database connection failed')
    expect(first.stack).toContain('connection refused')
    expect(second.message).toContain('Cache degraded')
    expect(second.stack).toContain('cache miss storm')
    expect(first.stack).not.toBe(second.stack)
  })

  it('a lone Error keeps message and stack', () => {
    const { logger, records } = makeSink()

    logger.error(new Error('solo failure'))

    const [rec] = records() as Array<{ message: string; stack?: string }>
    expect(rec.message).toBe('solo failure')
    expect(rec.stack).toContain('solo failure')
  })

  it('CONSUMER PROPERTY: createLogger() with level OMITTED passes debug/trace through to real winston (no hidden second gate)', () => {
    // Deliberately omit `level` (`makeSink` normally defaults to 'trace').
    const lines: string[] = []
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk))
        callback()
      },
    })
    const logger = createLogger({
      format: 'json',
      transports: [{ type: 'stream', options: { stream } }],
    })

    logger.debug('debug line')
    logger.trace('trace line')

    const records = lines.map((l) => JSON.parse(l) as Record<string, unknown>)
    expect(records.map((r) => r.message)).toEqual(['debug line', 'trace line'])
  })

  it("a per-transport level: 'silent' mutes only that transport (real silent:true flag), while a sibling transport still emits", () => {
    const mutedLines: string[] = []
    const activeLines: string[] = []
    const mutedStream = new Writable({
      write(chunk, _encoding, callback) {
        mutedLines.push(String(chunk))
        callback()
      },
    })
    const activeStream = new Writable({
      write(chunk, _encoding, callback) {
        activeLines.push(String(chunk))
        callback()
      },
    })

    const logger = createLogger({
      level: 'trace',
      format: 'json',
      transports: [
        { type: 'stream', level: 'silent', options: { stream: mutedStream } },
        { type: 'stream', options: { stream: activeStream } },
      ],
    })

    logger.error('should only reach the active transport')

    expect(mutedLines).toEqual([])
    expect(activeLines).toHaveLength(1)
  })

  it('level mapping is faithful, including trace → silly', () => {
    const { logger, records } = makeSink()

    logger.trace('t')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(records().map((r) => r.level)).toEqual(['silly', 'debug', 'info', 'warn', 'error'])
  })

  it('an explicit bond-side level gates below the core (caller opted into double-gating)', () => {
    const { logger, records } = makeSink('error')

    logger.warn('gated out')
    logger.error('let through')

    const recs = records()
    expect(recs).toHaveLength(1)
    expect(recs[0].message).toBe('let through')
  })

  it('CONSUMER PROPERTY: wired through the core, the default info gate applies exactly once', async () => {
    // Full lifecycle: setLogger(bond) → core logger call → real winston record.
    const { logger: winstonLogger, records } = makeSink()
    const { logger, resetLogger, setLevel, setLogger } = await import('@molecule/api-logger')

    try {
      setLogger(winstonLogger)
      setLevel('info')

      logger.debug('filtered by the core gate') // below 'info' → dropped by the core
      logger.info('passes the core gate')

      const recs = records()
      expect(recs).toHaveLength(1)
      expect(recs[0].message).toBe('passes the core gate')

      // Raising the core gate is the ONLY knob a consumer must touch: the
      // bond instance passes everything through, so debug now appears.
      setLevel('debug')
      logger.debug('visible after core setLevel')
      expect(records()).toHaveLength(2)
    } finally {
      setLevel('info')
      resetLogger()
    }
  })
})
