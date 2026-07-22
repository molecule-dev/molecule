/**
 * REAL-serialization tests (no pino mock): the unit suite mocks pino, so it
 * can never catch wire-format regressions. This file exercises the actual
 * pino instance through an in-process destination and asserts on the emitted
 * JSON — in particular that the molecule `{ error }` convention keeps the
 * stack (a nested `error: Error` otherwise serializes to `{}`).
 */

import { Writable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { createLogger } from '../provider.js'

/** Collects written chunks into an array of parsed JSON records. */
const makeSink = (): { sink: Writable; records: () => Record<string, unknown>[] } => {
  const lines: string[] = []
  const sink = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString())
      cb()
    },
  })
  return {
    sink,
    records: () =>
      lines
        .flatMap((l) => l.split('\n'))
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>),
  }
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 50))

describe('@molecule/api-logger-pino — real serialization', () => {
  it('serializes a nested { error } meta value with message AND stack (molecule convention)', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ destination: sink })
    logger.error('payment failed', { event: 'payment.failed', error: new Error('card declined') })
    await flush()
    const rec = records().find((r) => r.event === 'payment.failed')
    expect(rec).toBeDefined()
    const error = rec?.error as Record<string, unknown> | undefined
    expect(error?.message).toBe('card declined')
    expect(String(error?.stack ?? '')).toContain('card declined')
  })

  it('keeps the native err-key serialization working', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ destination: sink })
    logger.error('payment failed', { err: new Error('native err key') })
    await flush()
    const rec = records().find((r) => r.err !== undefined)
    const err = rec?.err as Record<string, unknown> | undefined
    expect(err?.message).toBe('native err key')
    expect(String(err?.stack ?? '')).toContain('native err key')
  })

  it('merges plain-object context fields into the record', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ destination: sink })
    logger.info('user signup', { event: 'user.signup', userId: 'u_1', plan: 'pro' })
    await flush()
    const rec = records().find((r) => r.event === 'user.signup')
    expect(rec?.userId).toBe('u_1')
    expect(rec?.plan).toBe('pro')
    expect(rec?.msg).toBe('user signup')
    expect(rec?.level).toBe(30)
  })
})
