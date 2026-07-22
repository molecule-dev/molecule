/**
 * REAL-DEPENDENCY integration tests — no fake timers, no mocked
 * `@molecule/api-bond`/`@molecule/api-scheduler`: the provider runs against
 * Node's actual timer machinery and the real bond registry.
 *
 * The unit suite runs entirely on vi.useFakeTimers() with the bond layer
 * mocked, so it could not feel the trap this file pins: the staggered-startup
 * setTimeout was untracked, and an `unschedule()` (or `stop()` + `start()`)
 * landing inside the stagger window let the pending timeout fire anyway —
 * starting an interval that NOTHING could ever stop, because the entry was
 * already gone from the registry. The "removed" task kept executing forever.
 *
 * Timing: intervals are 20–120 ms, waits are bounded polls (vi.waitFor) and
 * sub-second sleeps only — deterministic outcomes, no wall-clock races.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchedulerProvider } from '@molecule/api-scheduler'

import { createProvider } from '../provider.js'

/**
 * Resolves after `ms` milliseconds of real time.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

let provider: SchedulerProvider | null = null

beforeEach(() => {
  // getLogger() falls back to the console when no logger is bonded — spy so
  // expected failure/skip logs stay quiet AND become assertable evidence.
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  provider?.stop()
  provider = null
  vi.restoreAllMocks()
})

describe('@molecule/api-scheduler-default × REAL timers + REAL bond registry', () => {
  it('full lifecycle: schedule → start → real periodic execution → status → stop freezes', async () => {
    provider = createProvider({ staggerMs: 5 })
    let runsA = 0
    provider.schedule({
      name: 'a',
      intervalMs: 40,
      handler: async () => {
        runsA += 1
      },
    })
    provider.schedule({
      name: 'b',
      intervalMs: 40,
      handler: async () => {},
      enabled: false,
    })

    // The doc trap this pins: scheduling alone executes NOTHING until start().
    await sleep(120)
    expect(runsA).toBe(0)
    expect(provider.getStatus('a')?.lastRunAt).toBeNull()

    provider.start()
    await vi.waitFor(
      () => {
        expect(runsA).toBeGreaterThanOrEqual(2)
      },
      { timeout: 2000, interval: 10 },
    )

    const a = provider.getStatus('a')
    expect(a).not.toBeNull()
    expect(a?.lastRunAt).not.toBeNull()
    expect(a?.lastSuccessAt).not.toBeNull()
    expect(a?.nextRunAt).not.toBeNull()
    expect(a?.lastError).toBeNull()
    expect(typeof a?.durationMs).toBe('number')
    expect(a?.totalRuns).toBeGreaterThanOrEqual(2)
    expect(a?.totalFailures).toBe(0)
    expect(a?.enabled).toBe(true)

    // A disabled task is registered but never executed.
    const b = provider.getStatus('b')
    expect(b?.enabled).toBe(false)
    expect(b?.totalRuns).toBe(0)

    // stop() freezes execution — counts stay put across several intervals.
    provider.stop()
    const frozen = provider.getStatus('a')?.totalRuns
    await sleep(150)
    expect(provider.getStatus('a')?.totalRuns).toBe(frozen)
    expect(provider.getStatus('a')?.nextRunAt).toBeNull()
  })

  it('CONSUMER PROPERTY: a handler slower than its interval never overlaps itself', async () => {
    // Realistic slow flow: a 70ms task on a 20ms interval. Without the
    // isRunning guard the executions would stack; with it, ticks are skipped
    // and each skip is surfaced through the logger, not silent.
    provider = createProvider({ staggerMs: 1 })
    let inFlight = 0
    let maxInFlight = 0
    let runs = 0
    provider.schedule({
      name: 'slow',
      intervalMs: 20,
      handler: async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await sleep(70)
        inFlight -= 1
        runs += 1
      },
    })
    provider.start()

    await vi.waitFor(
      () => {
        expect(runs).toBeGreaterThanOrEqual(3)
      },
      { timeout: 2000, interval: 10 },
    )

    expect(maxInFlight).toBe(1)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('skipped: previous execution still running'),
    )
  })

  it('FAILURE DISAMBIGUATION: failing ≠ never-ran ≠ unknown — and failures do not unschedule', async () => {
    provider = createProvider({ staggerMs: 1 })
    provider.schedule({
      name: 'failing',
      intervalMs: 30,
      handler: async () => {
        throw new Error('db unreachable')
      },
    })
    provider.start()

    // ≥2 failures proves a failing task KEEPS its schedule (it is not dropped).
    await vi.waitFor(
      () => {
        expect(provider?.getStatus('failing')?.totalFailures).toBeGreaterThanOrEqual(2)
      },
      { timeout: 2000, interval: 10 },
    )

    const s = provider.getStatus('failing')
    expect(s?.lastError).toBe('db unreachable') // WHAT failed, verbatim
    expect(s?.lastSuccessAt).toBeNull() // never succeeded…
    expect(s?.lastRunAt).not.toBeNull() // …but it DID run — ≠ never-ran
    expect(s?.totalRuns).toBeGreaterThanOrEqual(2)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('db unreachable'))

    // Unknown task is a third, distinct answer: null, not a throw, not a zeroed status.
    expect(provider.getStatus('no-such-task')).toBeNull()
  })

  it('REGRESSION: unschedule() during the stagger window fully cancels the task', async () => {
    provider = createProvider({ staggerMs: 120 })
    let earlyRuns = 0
    let lateRuns = 0
    provider.schedule({
      name: 'early',
      intervalMs: 30,
      handler: async () => {
        earlyRuns += 1
      },
    })
    provider.schedule({
      name: 'late',
      intervalMs: 30,
      handler: async () => {
        lateRuns += 1
      },
    })
    provider.start() // 'early' staggered at 0ms, 'late' pending at 120ms

    // Remove 'late' while its stagger timeout is still pending.
    expect(provider.unschedule('late')).toBe(true)

    await vi.waitFor(
      () => {
        expect(earlyRuns).toBeGreaterThanOrEqual(2)
      },
      { timeout: 2000, interval: 10 },
    )
    await sleep(200) // well past the 120ms stagger + several 30ms intervals

    // Before the fix the orphaned stagger timeout fired anyway and started an
    // interval that nothing could stop — the "removed" task ran forever.
    expect(lateRuns).toBe(0)
  })

  it('REGRESSION: unschedule() inside the FIRST run (the one-off pattern) does not leak the interval', async () => {
    provider = createProvider({ staggerMs: 0 })
    let runs = 0
    provider.schedule({
      name: 'one-off',
      intervalMs: 30,
      handler: async () => {
        runs += 1
        // The only in-contract one-off: remove yourself on first execution.
        // The stagger callback arms the interval AFTER the handler's
        // synchronous portion — pre-fix this delete landed too late, the
        // interval was armed on a dead entry, and the task fired forever.
        provider.unschedule('one-off')
      },
    })
    provider.start()

    await sleep(200) // many 30ms intervals past the first run
    expect(runs).toBe(1)
    expect(provider.getStatus('one-off')).toBeNull()
  })

  it('REGRESSION: schedule() replacement during the first run does not arm the replaced entry', async () => {
    provider = createProvider({ staggerMs: 0 })
    let oldRuns = 0
    let newRuns = 0
    provider.schedule({
      name: 'swap',
      intervalMs: 30,
      handler: async () => {
        oldRuns += 1
        // Replace this task synchronously inside its own first run.
        provider.schedule({
          name: 'swap',
          intervalMs: 30,
          handler: async () => {
            newRuns += 1
          },
        })
      },
    })
    provider.start()

    await sleep(200)
    expect(oldRuns).toBe(1)
    expect(newRuns).toBeGreaterThanOrEqual(2)
  })

  it('REGRESSION: stop() during the stagger window then start() does not leak a duplicate interval', async () => {
    provider = createProvider({ staggerMs: 100 })
    let runs = 0
    provider.schedule({
      name: 'a',
      intervalMs: 50,
      handler: async () => {
        runs += 1
      },
    })

    provider.start() // stagger timeout pending
    provider.stop() // must cancel it — pre-fix it stayed pending
    provider.start() // pre-fix: BOTH timeouts fire (started is true again) → two intervals

    await vi.waitFor(
      () => {
        expect(runs).toBeGreaterThanOrEqual(2)
      },
      { timeout: 2000, interval: 10 },
    )

    // The sharp observable: after stop(), NOTHING may keep firing. A leaked
    // duplicate interval from the orphaned first stagger would keep counting.
    provider.stop()
    const frozen = runs
    await sleep(180)
    expect(runs).toBe(frozen)
  })
})
