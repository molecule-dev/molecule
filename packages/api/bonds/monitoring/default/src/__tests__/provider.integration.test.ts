/**
 * REAL-DEPENDENCY integration tests — no mocks at all (not even i18n).
 *
 * The unit suite (`provider.test.ts`) mocks `@molecule/api-i18n` and only ever
 * feeds well-behaved checks. That left two real-world failure paths unfelt:
 * a check that THROWS used to reject the whole `runAll()` (one bad custom
 * check turned the entire /health endpoint into an opaque 500), and the
 * per-check timeout timer was never cleared (every `runAll()` kept the event
 * loop alive for up to `checkTimeoutMs` — 10s by default — after resolving).
 * These tests exercise the real lifecycle end-to-end and pin both behaviors.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CheckResult, HealthCheck } from '@molecule/api-monitoring'

import { createProvider } from '../provider.js'

/** A well-behaved check resolving after `delayMs` (real timers, well under 1s). */
const slowCheck = (name: string, delayMs: number, result: CheckResult): HealthCheck => ({
  name,
  category: 'custom',
  check: () => new Promise<CheckResult>((resolve) => setTimeout(() => resolve(result), delayMs)),
})

describe('@molecule/api-monitoring-default × REAL lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('CONSUMER PROPERTY: a slow-but-legitimate check survives the default timeout', async () => {
    // A realistic health probe (a database round-trip, an HTTP HEAD) takes
    // tens to hundreds of ms. The 10s default must absorb that without
    // flagging the dependency down.
    const provider = createProvider()
    provider.register(slowCheck('db-roundtrip', 150, { status: 'operational', latencyMs: 150 }))

    const health = await provider.runAll()

    expect(health.status).toBe('operational')
    expect(health.checks['db-roundtrip'].status).toBe('operational')
    expect(provider.getLatest()).toEqual(health)
  })

  it('FAILURE DISAMBIGUATION: a THROWING check downs itself — not the whole snapshot — and reads differently from a TIMEOUT', async () => {
    const provider = createProvider({ checkTimeoutMs: 200 })

    // 1. A check whose function throws (the createCustomCheck footgun).
    provider.register({
      name: 'throwing',
      category: 'custom',
      check: () => {
        throw new Error('ECONNREFUSED 127.0.0.1:6379')
      },
    })
    // 2. A check that hangs past the timeout.
    provider.register({
      name: 'hanging',
      category: 'custom',
      // Never resolves — the provider's timeout must reap it.
      check: () => new Promise<CheckResult>(() => {}),
    })
    // 3. A healthy check that must still be reported despite its neighbors.
    provider.register(slowCheck('healthy', 10, { status: 'operational' }))

    // runAll must RESOLVE (previously the throwing check rejected everything).
    const health = await provider.runAll()

    expect(health.status).toBe('down')

    // The healthy check's result survived its broken neighbors.
    expect(health.checks['healthy'].status).toBe('operational')

    // A caller can tell the two failure modes apart by message:
    // thrown error → the thrown message; hang → the timeout message.
    expect(health.checks['throwing'].status).toBe('down')
    expect(health.checks['throwing'].message).toBe('ECONNREFUSED 127.0.0.1:6379')
    expect(health.checks['hanging'].status).toBe('down')
    expect(health.checks['hanging'].message).toBe('Check timed out after 200ms.')
    expect(health.checks['throwing'].message).not.toBe(health.checks['hanging'].message)
  })

  it('a synchronously-thrown non-Error value is stringified, not lost', async () => {
    const provider = createProvider({ checkTimeoutMs: 200 })
    provider.register({
      name: 'string-thrower',
      category: 'custom',
      check: () => {
        // Deliberately hostile input: user code CAN throw non-Errors.
        throw 'plain string failure' as unknown as Error
      },
    })

    const health = await provider.runAll()

    expect(health.checks['string-thrower']).toMatchObject({
      status: 'down',
      message: 'plain string failure',
    })
  })

  it('the per-check timeout timer is cleared once the race settles (no event-loop residue)', async () => {
    // With fake timers, a leaked 10s timeout would still be pending after
    // runAll resolves; the fix clears it in the race's finally.
    vi.useFakeTimers()
    const provider = createProvider() // default 10s timeout
    provider.register({
      name: 'instant',
      category: 'custom',
      check: async () => ({ status: 'operational' }),
    })

    const health = await provider.runAll()

    expect(health.checks['instant'].status).toBe('operational')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('full lifecycle: register → runAll → worst-status aggregation → deregister → empty = operational', async () => {
    const provider = createProvider()
    provider.register(slowCheck('ok', 5, { status: 'operational' }))
    provider.register(slowCheck('meh', 5, { status: 'degraded', message: 'high latency' }))

    const degraded = await provider.runAll()
    expect(degraded.status).toBe('degraded')
    expect(Object.keys(degraded.checks).sort()).toEqual(['meh', 'ok'])

    expect(provider.deregister('meh')).toBe(true)
    const healthy = await provider.runAll()
    expect(healthy.status).toBe('operational')

    expect(provider.deregister('ok')).toBe(true)
    const empty = await provider.runAll()
    expect(empty.status).toBe('operational')
    expect(empty.checks).toEqual({})
  })
})
