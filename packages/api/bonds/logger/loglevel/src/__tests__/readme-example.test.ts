/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real loglevel. loglevel binds the
 * console methods when its level is set (at import), so the console spies are
 * installed in `vi.hoisted`, before any import runs.
 *
 * @module
 */
import { afterAll, describe, expect, it, vi } from 'vitest'

import { logger, resetLogger, setLevel, setLogger } from '@molecule/api-logger'

import { provider } from '../index.js'

const sink = vi.hoisted(() => ({
  info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
  log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
  error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
}))

describe('README @example', () => {
  afterAll(() => {
    resetLogger()
    setLevel('info')
    vi.restoreAllMocks()
  })

  it('routes core logger calls through loglevel, gated by the core level', () => {
    setLevel('info')
    setLogger(provider)

    logger.info('Server started', { port: 3000 })
    expect(sink.info).toHaveBeenCalledWith('Server started', { port: 3000 })

    logger.debug('Cache warmed', { keys: 42 })
    expect(sink.log).not.toHaveBeenCalledWith('Cache warmed', { keys: 42 })

    setLevel('debug')
    logger.debug('Request received', { method: 'GET', path: '/api/items' })
    expect(sink.log).toHaveBeenCalledWith('Request received', { method: 'GET', path: '/api/items' })

    try {
      JSON.parse('{not json')
    } catch (caught) {
      logger.error('Failed to parse webhook payload', { error: caught })
    }
    const [message, meta] = sink.error.mock.calls.at(-1) ?? []
    expect(message).toBe('Failed to parse webhook payload')
    expect((meta as { error: unknown }).error).toBeInstanceOf(SyntaxError)
  })
})
