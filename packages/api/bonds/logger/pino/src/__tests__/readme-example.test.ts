/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real pino. The one change: the
 * instance also gets an in-process `destination` so the JSON lines pino would
 * write to stdout can be asserted on.
 *
 * @module
 */
import { afterAll, describe, expect, it } from 'vitest'

import { logger, resetLogger, setLevel, setLogger } from '@molecule/api-logger'

import { createLogger } from '../index.js'

describe('README @example', () => {
  afterAll(() => {
    resetLogger()
    setLevel('info')
  })

  it('bonds a pino instance and emits structured JSON records through the core', () => {
    const lines: string[] = []
    const records = (): Array<Record<string, unknown>> =>
      lines.map((line) => JSON.parse(line) as Record<string, unknown>)
    setLevel('info')

    setLogger(
      createLogger({
        name: 'api',
        pretty: process.env.NODE_ENV === 'development',
        destination: { write: (msg: string) => void lines.push(msg) },
      }),
    )

    logger.info('Server started', { port: 3000 })
    expect(records()[0]).toMatchObject({
      level: 30,
      name: 'api',
      port: 3000,
      msg: 'Server started',
    })

    logger.debug('Cache warmed', { keys: 42 })
    expect(lines).toHaveLength(1)

    setLevel('debug')
    logger.debug('Request received', { method: 'GET', path: '/api/items' })
    expect(records()[1]).toMatchObject({
      level: 20,
      method: 'GET',
      path: '/api/items',
      msg: 'Request received',
    })

    try {
      JSON.parse('{not json')
    } catch (error) {
      logger.error('Failed to parse webhook payload', { error })
    }
    const failure = records()[2] as { level: number; msg: string; error: Record<string, unknown> }
    expect(failure.level).toBe(50)
    expect(failure.msg).toBe('Failed to parse webhook payload')
    expect(failure.error.type).toBe('SyntaxError')
    expect(String(failure.error.stack)).toContain('SyntaxError')
  })
})
