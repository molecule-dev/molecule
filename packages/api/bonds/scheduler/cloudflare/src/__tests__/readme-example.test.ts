/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the Worker's `scheduled()` handler
 * runs every registered task once per Cron Trigger.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { getStatus, schedule, setProvider, start } from '@molecule/api-scheduler'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('runs the task when the Cron Trigger calls scheduled()', async () => {
    const scheduler = createProvider()
    setProvider(scheduler)

    let sweeps = 0
    schedule({
      name: 'monitor-sweep',
      intervalMs: 60_000,
      async handler() {
        sweeps++
      },
    })
    start()

    const worker = {
      async scheduled(
        _event: unknown,
        _env: unknown,
        ctx: { waitUntil(promise: Promise<unknown>): void },
      ): Promise<void> {
        ctx.waitUntil(scheduler.runDueTasks())
      },
    }

    const pending: Promise<unknown>[] = []
    await worker.scheduled({ cron: '* * * * *' }, {}, { waitUntil: (p) => pending.push(p) })
    await Promise.all(pending)

    expect(sweeps).toBe(1)
    expect(getStatus('monitor-sweep')).toMatchObject({
      name: 'monitor-sweep',
      totalRuns: 1,
      totalFailures: 0,
      lastError: null,
      nextRunAt: null,
    })
  })
})
