import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// The point of this bond is that a Worker has no long-lived process, so the
// interesting cases are the ones where the default (setInterval) provider's
// assumptions break: nothing may run on a timer, one failing task must not
// abort a Cron Trigger invocation, and a status field this runtime cannot know
// must not be invented.

const logger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({ getLogger: () => logger }))

const task = (name: string, handler: () => Promise<void>, intervalMs = 60_000) => ({
  name,
  intervalMs,
  handler,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('scheduling', () => {
  it('never runs a task on its own — only a trigger runs it', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', handler))
    scheduler.start()

    // No timers exist, so advancing time must change nothing.
    vi.useFakeTimers()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    vi.useRealTimers()
    expect(handler).not.toHaveBeenCalled()

    await scheduler.runDueTasks()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('replaces a task registered under the same name', async () => {
    const first = vi.fn(async () => undefined)
    const second = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', first))
    scheduler.schedule(task('sweep', second))
    scheduler.start()

    await scheduler.runDueTasks()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('unschedules by name', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', handler))
    scheduler.start()

    expect(scheduler.unschedule('sweep')).toBe(true)
    expect(scheduler.unschedule('sweep')).toBe(false)
    await scheduler.runDueTasks()

    expect(handler).not.toHaveBeenCalled()
  })

  it('skips a task that is explicitly disabled', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule({ ...task('sweep', handler), enabled: false })
    scheduler.start()

    await scheduler.runDueTasks()

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('runDueTasks', () => {
  it('warns loudly instead of silently doing nothing when not started', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', handler))

    const statuses = await scheduler.runDueTasks()

    expect(handler).not.toHaveBeenCalled()
    expect(statuses).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('before start()'))
  })

  it('never rejects when a task throws, and still runs the rest', async () => {
    const boom = vi.fn(async () => {
      throw new Error('probe exploded')
    })
    const after = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('boom', boom))
    scheduler.schedule(task('after', after))
    scheduler.start()

    // A rejection here would fail the Cron Trigger invocation, and the platform
    // would retry it — re-running the tasks that had already succeeded.
    await expect(scheduler.runDueTasks()).resolves.toBeInstanceOf(Array)

    expect(after).toHaveBeenCalledTimes(1)
    expect(scheduler.getStatus('boom')?.lastError).toBe('probe exploded')
    expect(scheduler.getStatus('boom')?.totalFailures).toBe(1)
  })

  it('runs every task on every trigger by default, ignoring intervalMs', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    // An hour-long interval must NOT suppress the second trigger: the cron
    // schedule is the schedule.
    scheduler.schedule(task('sweep', handler, 3_600_000))
    scheduler.start()

    await scheduler.runDueTasks()
    await scheduler.runDueTasks()

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('honours intervalMs within one isolate when explicitly opted in', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider({ respectIntervalWithinIsolate: true })
    scheduler.schedule(task('sweep', handler, 3_600_000))
    scheduler.start()

    await scheduler.runDueTasks()
    await scheduler.runDueTasks()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops running after stop()', async () => {
    const handler = vi.fn(async () => undefined)
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', handler))
    scheduler.start()
    await scheduler.runDueTasks()
    scheduler.stop()

    await scheduler.runDueTasks()

    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('status', () => {
  it('reports nextRunAt as null rather than guessing the platform schedule', async () => {
    const scheduler = createProvider()
    scheduler.schedule(task('sweep', async () => undefined))
    scheduler.start()

    await scheduler.runDueTasks()

    const status = scheduler.getStatus('sweep')
    expect(status?.nextRunAt).toBeNull()
    expect(status?.lastRunAt).not.toBeNull()
    expect(status?.totalRuns).toBe(1)
    expect(status?.enabled).toBe(true)
  })

  it('returns null for an unknown task and lists all known ones', async () => {
    const scheduler = createProvider()
    scheduler.schedule(task('a', async () => undefined))
    scheduler.schedule(task('b', async () => undefined))

    expect(scheduler.getStatus('nope')).toBeNull()
    expect(
      scheduler
        .getAllStatuses()
        .map((s) => s.name)
        .sort(),
    ).toEqual(['a', 'b'])
  })

  it('clears lastError once a failing task succeeds again', async () => {
    let shouldFail = true
    const scheduler = createProvider()
    scheduler.schedule(
      task('flaky', async () => {
        if (shouldFail) throw new Error('nope')
      }),
    )
    scheduler.start()

    await scheduler.runDueTasks()
    expect(scheduler.getStatus('flaky')?.lastError).toBe('nope')

    shouldFail = false
    await scheduler.runDueTasks()

    expect(scheduler.getStatus('flaky')?.lastError).toBeNull()
    expect(scheduler.getStatus('flaky')?.lastSuccessAt).not.toBeNull()
    expect(scheduler.getStatus('flaky')?.totalFailures).toBe(1)
  })
})
