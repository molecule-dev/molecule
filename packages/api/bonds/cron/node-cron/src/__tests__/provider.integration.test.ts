/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual node-cron v4.
 *
 * The unit suite exercises the provider's bookkeeping but never lets a real
 * cron tick fire, so it could not feel the two consumer-facing traps this file
 * pins: (1) a handler that threw once used to mark the job `failed` and STOP it
 * permanently — a transient network blip silently killed a nightly cleanup
 * forever, with only a warn-level log as the trace; (2) node-cron 4 throws
 * OPAQUE errors on a malformed expression (`TypeError: Cannot read properties
 * of undefined (reading 'replace')`) that read like a bug in this package, so
 * the bond must pre-validate and name the job + expression instead.
 *
 * Timing: jobs use the 6-field every-second expression (`* * * * * *`), so a
 * tick always arrives within ≤1s; waits are bounded polls on that certainty,
 * never fixed sleeps.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CronProvider } from '@molecule/api-cron'

import { createProvider } from '../provider.js'

const providers: CronProvider[] = []

/**
 * Tracks a provider so its timers are released after each test.
 */
const tracked = (p: CronProvider): CronProvider => {
  providers.push(p)
  return p
}

afterEach(async () => {
  for (const p of providers) {
    await p.close?.()
  }
  providers.length = 0
  vi.restoreAllMocks()
})

describe('@molecule/api-cron-node-cron × REAL node-cron', () => {
  it('full lifecycle: an every-second job really ticks — bookkeeping, pause, resume, cancel', async () => {
    const p = tracked(createProvider())
    let runs = 0
    const jobId = await p.schedule('ticker', '* * * * * *', async () => {
      runs += 1
    })

    // Before the first tick: registered, never run, with a REAL next-run date
    // (node-cron 4's getNextRun() — guards drift on the pinned dependency API).
    let [job] = await p.list()
    expect(job.id).toBe(jobId)
    expect(job.status).toBe('active')
    expect(job.runCount).toBe(0)
    expect(job.nextRun).toBeInstanceOf(Date)

    // The next second boundary arrives within ≤1s — wait for the real tick.
    await vi.waitFor(
      () => {
        expect(runs).toBeGreaterThanOrEqual(1)
      },
      { timeout: 2500, interval: 25 },
    )
    ;[job] = await p.list()
    expect(job.runCount).toBeGreaterThanOrEqual(1)
    expect(job.lastRun).toBeInstanceOf(Date)

    // pause is observable WITHOUT sleeping: real node-cron reports no next
    // run for a stopped task, so the bond's nextRun goes undefined.
    await p.pause(jobId)
    ;[job] = await p.list()
    expect(job.status).toBe('paused')
    expect(job.nextRun).toBeUndefined()

    await p.resume(jobId)
    ;[job] = await p.list()
    expect(job.status).toBe('active')
    expect(job.nextRun).toBeInstanceOf(Date)

    await p.cancel(jobId)
    expect(await p.list()).toEqual([])
  }, 8000)

  it('CONSUMER PROPERTY: a handler that throws on a tick keeps its schedule (transient failures survive)', async () => {
    // The regression this pins: one throw used to set status 'failed' and stop
    // the task forever — "why did my cron silently stop running?" Real cron
    // semantics (crontab, the BullMQ bond, k8s CronJob) keep firing.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const p = tracked(createProvider())
    let calls = 0
    await p.schedule('flaky-cleanup', '* * * * * *', async () => {
      calls += 1
      if (calls === 1) throw new Error('transient network blip')
    })

    // A SECOND tick after the failing first one proves the schedule survived.
    await vi.waitFor(
      () => {
        expect(calls).toBeGreaterThanOrEqual(2)
      },
      { timeout: 3500, interval: 25 },
    )

    const [job] = await p.list()
    expect(job.status).toBe('active') // NOT 'failed' — still scheduled
    expect(job.runCount).toBeGreaterThanOrEqual(2)

    // The failure was loudly logged with job context — not swallowed.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('job stays scheduled'),
      expect.objectContaining({ name: 'flaky-cleanup' }),
    )
  }, 8000)

  it('FAILURE DISAMBIGUATION: bad expression vs unknown job id are distinct, actionable errors', async () => {
    const p = tracked(createProvider())

    // Raw node-cron throws `TypeError: Cannot read properties of undefined
    // (reading 'replace')` for this input — nothing a caller could act on.
    // The bond names the job AND the offending expression.
    await expect(p.schedule('typo-job', 'every day at 3am', async () => {})).rejects.toThrow(
      /Invalid cron expression for job 'typo-job'.*every day at 3am/,
    )

    // An unknown id is a different failure with a different, id-bearing message.
    await expect(p.runNow('nope')).rejects.toThrow('Cron job not found: nope')
    await expect(p.cancel('nope')).rejects.toThrow('Cron job not found: nope')
    await expect(p.pause('nope')).rejects.toThrow('Cron job not found: nope')
    await expect(p.resume('nope')).rejects.toThrow('Cron job not found: nope')
  })

  it('runOnInit executes immediately through the real task.execute(); runNow bypasses the schedule', async () => {
    const p = tracked(createProvider())
    let runs = 0
    const jobId = await p.schedule(
      'init-job',
      '0 3 * * *', // will not tick during the test — only init/manual paths run
      async () => {
        runs += 1
      },
      { runOnInit: true },
    )
    expect(runs).toBe(1)

    let [job] = await p.list()
    expect(job.runCount).toBe(1)
    expect(job.lastRun).toBeInstanceOf(Date)

    await p.runNow(jobId)
    expect(runs).toBe(2)
    ;[job] = await p.list()
    expect(job.runCount).toBe(2)
  })
})
