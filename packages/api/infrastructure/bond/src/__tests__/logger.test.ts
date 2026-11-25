import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, unbondAll } from '../bond.js'
import { getLogger } from '../logger.js'
import { reset } from '../registry.js'

describe('getLogger', () => {
  beforeEach(() => {
    reset()
    unbondAll()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('prints info and above to the console by default, not debug or trace (OLD MUSTFAIL)', () => {
    // An app with no logger bond printed every provider's debug line: the uploads filesystem
    // provider's "refused a file id" line on each 404 (harness eval add, 2026-11-25).
    vi.stubEnv('LOG_LEVEL', '')
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const trace = vi.spyOn(console, 'trace').mockImplementation(() => {})
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = getLogger()
    logger.trace('t')
    logger.debug('d')
    logger.info('i')
    logger.error('e')
    expect(trace).not.toHaveBeenCalled()
    expect(debug).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledWith('i')
    expect(error).toHaveBeenCalledWith('e')
  })

  it('prints debug when LOG_LEVEL asks for it, read at call time', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const logger = getLogger()
    vi.stubEnv('LOG_LEVEL', 'DEBUG')
    logger.debug('d', { id: 1 })
    expect(debug).toHaveBeenCalledWith('d', { id: 1 })
  })

  it('prints nothing at LOG_LEVEL=silent, and info for a value that is not a level', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = getLogger()
    vi.stubEnv('LOG_LEVEL', 'silent')
    logger.error('e')
    expect(error).not.toHaveBeenCalled()
    vi.stubEnv('LOG_LEVEL', 'loud')
    logger.info('i')
    expect(info).toHaveBeenCalledWith('i')
  })

  it('counterexample: a bonded logger gets every level, its own gate decides', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const bonded = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    bond('logger', bonded)
    getLogger().debug('d')
    expect(bonded.debug).toHaveBeenCalledWith('d')
    expect(debug).not.toHaveBeenCalled()
  })
})
