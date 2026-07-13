/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual loglevel.
 *
 * The unit suite (`index.test.ts`) mocks loglevel, so it can only validate OUR
 * assumptions about loglevel — not loglevel. That gap let a hostile default
 * ship unfelt: loglevel's out-of-the-box level is WARN, so the documented
 * `setLogger(provider)` → `logger.info('Server started…')` flow printed
 * NOTHING — the exact "the library is broken" spiral the two-factor-otplib
 * exemplar warns about. These tests exercise the real library end-to-end and
 * pin the pass-through default.
 *
 * loglevel binds the console methods when a level is set, so the console spies
 * are installed BEFORE the module under test is (re-)imported — a fresh
 * dynamic import after `vi.resetModules()` re-runs the import-time
 * `setLevel(trace)` against the spied console, which is exactly the
 * out-of-the-box state a consumer sees.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Spies on the real console methods loglevel writes through. */
const spies = () => ({
  trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
})

describe('@molecule/api-logger-loglevel × REAL loglevel', () => {
  let consoleSpy: ReturnType<typeof spies>

  beforeEach(() => {
    vi.resetModules()
    consoleSpy = spies()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Freshly imports the package so import-time level setup runs against the spies. */
  const importFresh = async () => import('../index.js')

  it('CONSUMER PROPERTY: the documented core flow emits info OUT OF THE BOX', async () => {
    // The regression this pins: raw loglevel defaults to WARN, so the first
    // thing the core docs do after wiring the bond — logger.info(...) —
    // silently printed nothing. The provider must pass info through with NO
    // configuration calls at all.
    const { provider } = await importFresh()

    provider.info('Server started on port', 3000)

    expect(consoleSpy.info).toHaveBeenCalledWith('Server started on port', 3000)
  })

  it('CONSUMER PROPERTY: debug/trace also pass through (the core gate is the only filter)', async () => {
    // If the bond kept a second, hidden gate, the core's setLevel('debug')
    // would mysteriously no-op. The bond must emit everything it is handed.
    const { provider } = await importFresh()

    provider.debug('Request received', { method: 'GET', path: '/api' })
    provider.trace('entering handler')

    // Real-library detail a mocked test can't see: loglevel deliberately
    // routes `debug` through console.log (not console.debug).
    expect(consoleSpy.log).toHaveBeenCalledWith('Request received', {
      method: 'GET',
      path: '/api',
    })
    expect(consoleSpy.trace).toHaveBeenCalledWith('entering handler')
  })

  it('FAILURE DISAMBIGUATION: warn vs error land on distinct console channels with the Error intact', async () => {
    // A caller triaging output must be able to tell severities apart AND see
    // the real Error (message + stack), not a stringified husk.
    const { provider } = await importFresh()
    const dbError = new Error('connection refused')
    const cacheError = new Error('cache miss storm')

    provider.error('Database connection failed', dbError)
    provider.warn('Cache degraded', cacheError)

    expect(consoleSpy.error).toHaveBeenCalledWith('Database connection failed', dbError)
    expect(consoleSpy.warn).toHaveBeenCalledWith('Cache degraded', cacheError)
    // The two failures stay distinguishable — each channel got ITS error object.
    const [, errorArg] = consoleSpy.error.mock.calls[0]
    const [, warnArg] = consoleSpy.warn.mock.calls[0]
    expect((errorArg as Error).message).toBe('connection refused')
    expect((warnArg as Error).message).toBe('cache miss storm')
  })

  it("setLevel('silent') drops everything; re-raising restores output", async () => {
    const { provider, setLevel } = await importFresh()

    setLevel('silent')
    provider.error('this must not appear')
    expect(consoleSpy.error).not.toHaveBeenCalled()

    setLevel('trace')
    provider.error('this must appear')
    expect(consoleSpy.error).toHaveBeenCalledWith('this must appear')
  })

  it('createLogger without a level is pass-through; an explicit level gates below it', async () => {
    const { createLogger } = await importFresh()

    // Named instance, no level: must NOT inherit loglevel's WARN default.
    const verbose = createLogger({ name: 'integration-verbose' })
    verbose.info('visible')
    expect(consoleSpy.info).toHaveBeenCalledWith('visible')

    // Explicit bond-side gate still works for callers that opt in.
    const gated = createLogger({ name: 'integration-gated', level: 'error' })
    gated.warn('gated out')
    gated.error('let through')
    expect(consoleSpy.warn).not.toHaveBeenCalled()
    expect(consoleSpy.error).toHaveBeenCalledWith('let through')
  })

  it('the exported raw `log` instance satisfies the core Logger contract (docs wiring)', async () => {
    // The core's module docs show `setLogger(log)` with the raw instance —
    // that only works if the instance emits info out of the box too.
    const { log } = await importFresh()

    log.info('raw instance works')

    expect(consoleSpy.info).toHaveBeenCalledWith('raw instance works')
  })
})
