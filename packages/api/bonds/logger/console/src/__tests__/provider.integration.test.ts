/**
 * REAL-DEPENDENCY integration tests — no `vi.mock` anywhere: the actual
 * console channels, the actual `@molecule/api-logger` core, the real bond
 * registry.
 *
 * The unit suite (`provider.test.ts`) verifies per-method delegation in
 * isolation but never wires the provider through the core — so it can't feel
 * the one thing that actually bites consumers: the CORE's minimum-level gate
 * (default `'info'`) sits in front of this bond, which means the documented
 * `setLogger(provider)` → `logger.debug(...)` flow prints NOTHING out of the
 * box. That silence looks exactly like "the logger is broken" to a debugging
 * executor. These tests pin the full lifecycle: core gate → bond → real
 * console channel.
 *
 * (Console spies intercept the terminal write so the test can observe it —
 * the delegation chain under test is real end-to-end.)
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getLevel, logger, resetLogger, setLevel, setLogger } from '@molecule/api-logger'

import { provider } from '../provider.js'

/** Spies on the real console methods the provider writes through. */
const spies = () => ({
  trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
})

describe('@molecule/api-logger-console × REAL core lifecycle', () => {
  let consoleSpy: ReturnType<typeof spies>
  let initialLevel: ReturnType<typeof getLevel>

  beforeEach(() => {
    consoleSpy = spies()
    initialLevel = getLevel()
    setLevel('info') // the documented default — explicit so the test is deterministic
    setLogger(provider)
  })

  afterEach(() => {
    setLevel(initialLevel)
    resetLogger()
    vi.restoreAllMocks()
  })

  it("CONSUMER PROPERTY: the documented flow works out of the box — and debug's silence is the GATE, not a broken logger", () => {
    // The core docs' first post-wiring call must appear with no configuration.
    logger.info('Server started on port', 3000)
    expect(consoleSpy.info).toHaveBeenCalledWith('Server started on port', 3000)

    // Below the default 'info' gate: dropped BEFORE the bond is invoked.
    logger.debug('Request received', { method: 'GET', path: '/api' })
    expect(consoleSpy.debug).not.toHaveBeenCalled()

    // Lowering the CORE gate is the single documented knob — the bond itself
    // has no second gate, so debug flows immediately.
    setLevel('debug')
    logger.debug('Request received', { method: 'GET', path: '/api' })
    expect(consoleSpy.debug).toHaveBeenCalledWith('Request received', {
      method: 'GET',
      path: '/api',
    })
  })

  it('FAILURE DISAMBIGUATION: warn vs error land on distinct console channels with each Error intact', () => {
    const dbError = new Error('connection refused')
    const cacheError = new Error('cache miss storm')

    logger.error('Database connection failed', dbError)
    logger.warn('Cache degraded', cacheError)

    // Distinct severities → distinct channels; a triaging caller can filter
    // stderr-level failures from warnings.
    expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1)

    // Each channel got ITS OWN Error object — message and stack survive
    // (console semantics: no stringification into '[object Object]' husks).
    const [, errorArg] = consoleSpy.error.mock.calls[0]
    const [, warnArg] = consoleSpy.warn.mock.calls[0]
    expect(errorArg).toBeInstanceOf(Error)
    expect((errorArg as Error).message).toBe('connection refused')
    expect((errorArg as Error).stack).toContain('connection refused')
    expect((warnArg as Error).message).toBe('cache miss storm')
    expect((errorArg as Error).message).not.toBe((warnArg as Error).message)
  })

  it('context objects and extra args pass through untouched (console semantics)', () => {
    setLevel('trace')

    logger.info('msg', { requestId: 'r-1' }, 42)
    expect(consoleSpy.info).toHaveBeenCalledWith('msg', { requestId: 'r-1' }, 42)

    logger.trace('entering handler')
    expect(consoleSpy.trace).toHaveBeenCalledWith('entering handler')
  })

  it("setLevel('silent') drops EVERYTHING — including error — until the gate is re-lowered", () => {
    setLevel('silent')
    logger.error('this must not appear')
    expect(consoleSpy.error).not.toHaveBeenCalled()

    setLevel('info')
    logger.error('this must appear')
    expect(consoleSpy.error).toHaveBeenCalledWith('this must appear')
  })
})
