/**
 * REAL-serialization tests (no winston mock): the unit suite mocks winston,
 * so it can never catch wire-format regressions. This file exercises the
 * actual winston instance through a stream transport and asserts on the
 * emitted JSON — in particular that the molecule `{ error }` convention keeps
 * the stack (a nested `error: Error` otherwise serializes to `{}`).
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

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 100))

describe('@molecule/api-logger-winston — real serialization', () => {
  it('serializes a nested { error } meta value with message AND stack (molecule convention)', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ transports: [{ type: 'stream', options: { stream: sink } }] })
    logger.error('payment failed', { event: 'payment.failed', error: new Error('card declined') })
    await flush()
    const rec = records().find((r) => r.event === 'payment.failed')
    expect(rec).toBeDefined()
    const error = rec?.error as Record<string, unknown> | undefined
    expect(error?.message).toBe('card declined')
    expect(String(error?.stack ?? '')).toContain('card declined')
  })

  it('preserves the stack when the logged entry itself is an Error', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ transports: [{ type: 'stream', options: { stream: sink } }] })
    logger.error(new Error('top-level failure'))
    await flush()
    const rec = records().find((r) => r.message === 'top-level failure')
    expect(rec).toBeDefined()
    expect(String(rec?.stack ?? '')).toContain('top-level failure')
  })

  it('merges plain-object context fields into the record', async () => {
    const { sink, records } = makeSink()
    const logger = createLogger({ transports: [{ type: 'stream', options: { stream: sink } }] })
    logger.info('user signup', { event: 'user.signup', userId: 'u_1', plan: 'pro' })
    await flush()
    const rec = records().find((r) => r.event === 'user.signup')
    expect(rec?.userId).toBe('u_1')
    expect(rec?.plan).toBe('pro')
    expect(rec?.level).toBe('info')
  })
})
