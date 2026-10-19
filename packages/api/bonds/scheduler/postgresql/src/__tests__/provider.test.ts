const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}

vi.mock('@molecule/api-bond', () => ({
  getLogger: vi.fn(() => mockLogger),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchedulerTaskRunLock } from '@molecule/api-scheduler'

import { createProvider } from '../provider.js'

/**
 * One shared lock store — stands in for PostgreSQL's advisory locks. Every
 * provider instance shares it, so exactly one run per task name wins.
 */
class FakeRunLock implements SchedulerTaskRunLock {
  readonly held = new Set<string>()
  readonly close = vi.fn(async () => {})
  /** When set, every acquisition reports "not acquired" (store unreachable). */
  failing = false

  /** {@inheritDoc SchedulerTaskRunLock.runExclusive} */
  async runExclusive(
    taskName: string,
    run: () => Promise<void>,
    options?: { holdMs?: number },
  ): Promise<boolean> {
    if (this.failing) return false
    if (this.held.has(taskName)) return false
    this.held.add(taskName)
    try {
      await run()
    } catch (error) {
      this.held.delete(taskName)
      throw error
    }
    const holdMs = options?.holdMs ?? 0
    if (holdMs > 0) {
      const timer = setTimeout(() => this.held.delete(taskName), holdMs)
      timer.unref?.()
    } else {
      this.held.delete(taskName)
    }
    return true
  }
}

/** A task whose handler resolves immediately. */
function task(name: string, handler = vi.fn().mockResolvedValue(undefined), intervalMs = 100) {
  return { name, intervalMs, handler }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('@molecule/api-scheduler-postgresql', () => {
  it('runs the task once across two instances for the same tick', async () => {
    const lock = new FakeRunLock()
    const first = createProvider({ lock, staggerMs: 0 })
    const second = createProvider({ lock, staggerMs: 0 })
    const handler = vi.fn().mockResolvedValue(undefined)

    first.schedule(task('cleanup', handler))
    second.schedule(task('cleanup', handler))
    first.start()
    second.start()

    // First tick: both timers fire, one wins the shared lock.
    await vi.advanceTimersByTimeAsync(1)
    expect(handler).toHaveBeenCalledTimes(1)

    // Exactly one instance records the run; the loser skipped it.
    const runs = [first.getStatus('cleanup')!.totalRuns, second.getStatus('cleanup')!.totalRuns]
    expect(runs.reduce((sum, n) => sum + n, 0)).toBe(1)
    expect(
      [first.getStatus('cleanup')!.lastRunAt, second.getStatus('cleanup')!.lastRunAt].filter(
        Boolean,
      ),
    ).toHaveLength(1)

    // Next interval: the lock was released, so one run again (never two).
    await vi.advanceTimersByTimeAsync(100)
    expect(handler).toHaveBeenCalledTimes(2)

    first.stop()
    second.stop()
  })

  it('does not run before start(), and stops running after stop()', async () => {
    const lock = new FakeRunLock()
    const provider = createProvider({ lock, staggerMs: 0 })
    const handler = vi.fn().mockResolvedValue(undefined)
    provider.schedule(task('cleanup', handler))

    await vi.advanceTimersByTimeAsync(500)
    expect(handler).not.toHaveBeenCalled()

    provider.start()
    await vi.advanceTimersByTimeAsync(1)
    expect(handler).toHaveBeenCalledTimes(1)

    provider.stop()
    await vi.advanceTimersByTimeAsync(500)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('skips the run when the lock store is unreachable', async () => {
    const lock = new FakeRunLock()
    lock.failing = true
    const provider = createProvider({ lock, staggerMs: 0 })
    const handler = vi.fn().mockResolvedValue(undefined)
    provider.schedule(task('cleanup', handler))
    provider.start()

    await vi.advanceTimersByTimeAsync(1)
    expect(handler).not.toHaveBeenCalled()
    expect(provider.getStatus('cleanup')!.totalRuns).toBe(0)

    provider.stop()
  })

  it('runs uncoordinated only when explicitly opted in', async () => {
    // The opt-in lives in the PostgreSQL lock itself (lock.test.ts drives it on
    // a failing lock query); here only the provider's contract is under test:
    // a false from the lock means "skip", never "retry blindly".
    const lock = new FakeRunLock()
    lock.failing = true
    const provider = createProvider({ lock, staggerMs: 0 })
    const handler = vi.fn().mockResolvedValue(undefined)
    provider.schedule(task('cleanup', handler))
    provider.start()

    await vi.advanceTimersByTimeAsync(1)
    expect(handler).not.toHaveBeenCalled()

    provider.stop()
  })

  it('records a handler failure and releases the lock for the next tick', async () => {
    const lock = new FakeRunLock()
    const provider = createProvider({ lock, staggerMs: 0 })
    const handler = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    provider.schedule(task('cleanup', handler))
    provider.start()

    await vi.advanceTimersByTimeAsync(1)
    const status = provider.getStatus('cleanup')!
    expect(status.lastError).toBe('boom')
    expect(status.totalFailures).toBe(1)
    expect(status.totalRuns).toBe(0)
    expect(lock.held.has('cleanup')).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(provider.getStatus('cleanup')!.totalRuns).toBe(1)

    provider.stop()
  })

  it('releases the lock connection on stop', async () => {
    const lock = new FakeRunLock()
    const provider = createProvider({ lock, staggerMs: 0 })
    provider.schedule(task('cleanup'))
    provider.start()
    await vi.advanceTimersByTimeAsync(1)

    provider.stop()
    expect(lock.close).toHaveBeenCalledTimes(1)
  })

  it('unschedule removes the task and returns true', async () => {
    const provider = createProvider({ lock: new FakeRunLock(), staggerMs: 0 })
    const handler = vi.fn().mockResolvedValue(undefined)
    provider.schedule(task('cleanup', handler))
    provider.start()
    await vi.advanceTimersByTimeAsync(1)

    expect(provider.unschedule('cleanup')).toBe(true)
    expect(provider.getStatus('cleanup')).toBeNull()
    await vi.advanceTimersByTimeAsync(500)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(provider.unschedule('missing')).toBe(false)
  })

  it('reports a nextRunAt and an enabled flag', async () => {
    const provider = createProvider({ lock: new FakeRunLock(), staggerMs: 0 })
    provider.schedule({ ...task('cleanup'), enabled: false })
    const status = provider.getStatus('cleanup')!
    expect(status.enabled).toBe(false)
    expect(status.nextRunAt).toBeNull()
  })
})
