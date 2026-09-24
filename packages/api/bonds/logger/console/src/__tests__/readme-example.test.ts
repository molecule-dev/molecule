/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `console` sink is spied on.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { logger, resetLogger, setLevel, setLogger } from '@molecule/api-logger'

import { provider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetLogger()
    setLevel('info')
  })

  it('routes core logger calls to console, gated by the core level', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setLevel('info')

    setLogger(provider)

    logger.info('Server started', { port: 3000 })
    expect(info).toHaveBeenCalledWith('Server started', { port: 3000 })

    logger.debug('Cache warmed', { keys: 42 })
    expect(debug).not.toHaveBeenCalled()

    setLevel('debug')
    logger.debug('Request received', { method: 'GET', path: '/api/items' })
    expect(debug).toHaveBeenCalledWith('Request received', { method: 'GET', path: '/api/items' })

    try {
      JSON.parse('{not json')
    } catch (caught) {
      logger.error('Failed to parse webhook payload', { error: caught })
    }
    expect(error).toHaveBeenCalledTimes(1)
    const [message, meta] = error.mock.calls[0] ?? []
    expect(message).toBe('Failed to parse webhook payload')
    expect((meta as { error: unknown }).error).toBeInstanceOf(SyntaxError)
  })
})
