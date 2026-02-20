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

vi.mock('@molecule/api-scheduler', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ScheduledTask } from '@molecule/api-scheduler'

import { createProvider } from '../provider.js'

/**
 * Creates a mock scheduled task for testing.
 */
const createTask = (name: string, overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  name,
  intervalMs: 10000,
  handler: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('@molecule/api-scheduler-default', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createProvider', () => {
    it('should return a valid SchedulerProvider', () => {
      const provider = createProvider()

      expect(typeof provider.schedule).toBe('function')
      expect(typeof provider.unschedule).toBe('function')
      expect(typeof provider.getStatus).toBe('function')
      expect(typeof provider.getAllStatuses).toBe('function')
      expect(typeof provider.start).toBe('function')
      expect(typeof provider.stop).toBe('function')
    })
  })

  describe('schedule', () => {
    it('should add a task and make it visible via getStatus', () => {
      const provider = createProvider()
      const task = createTask('cleanup')

      provider.schedule(task)

      const status = provider.getStatus('cleanup')
      expect(status).not.toBeNull()
      expect(status!.name).toBe('cleanup')
      expect(status!.isRunning).toBe(false)
      expect(status!.lastRunAt).toBeNull()
      expect(status!.lastError).toBeNull()
    })

    it('should not start task until start() is called', () => {
      const provider = createProvider()
      const handler = vi.fn().mockResolvedValue(undefined)
      const task = createTask('cleanup', { handler })

      provider.schedule(task)

      // Advance time well beyond intervalMs
      vi.advanceTimersByTime(60000)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('unschedule', () => {
    it('should remove an existing task and return true', () => {
      const provider = createProvider()
      provider.schedule(createTask('cleanup'))

      const result = provider.unschedule('cleanup')

      expect(result).toBe(true)
      expect(provider.getStatus('cleanup')).toBeNull()
    })

    it('should return false for a non-existent task', () => {
      const provider = createProvider()

      const result = provider.unschedule('nonexistent')

      expect(result).toBe(false)
    })

    it('should stop the timer for a running task', async () => {
      const provider = createProvider()
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('cleanup', { handler, intervalMs: 5000 }))
      provider.start()

      // Advance past stagger delay (0ms for first task) to trigger first run + set interval
      await vi.advanceTimersByTimeAsync(1)

      expect(handler).toHaveBeenCalledTimes(1)

      provider.unschedule('cleanup')

      // Advance past the interval — handler should not be called again
      await vi.advanceTimersByTimeAsync(10000)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAllStatuses', () => {
    it('should return all task statuses', () => {
      const provider = createProvider()
      provider.schedule(createTask('task-a'))
      provider.schedule(createTask('task-b'))
      provider.schedule(createTask('task-c'))

      const statuses = provider.getAllStatuses()

      expect(statuses).toHaveLength(3)
      expect(statuses.map((s) => s.name).sort()).toEqual(['task-a', 'task-b', 'task-c'])
    })

    it('should return empty array when no tasks are scheduled', () => {
      const provider = createProvider()

      expect(provider.getAllStatuses()).toEqual([])
    })
  })

  describe('getStatus', () => {
    it('should return null for an unknown task', () => {
      const provider = createProvider()

      expect(provider.getStatus('unknown')).toBeNull()
    })

    it('should return status with correct shape', () => {
      const provider = createProvider()
      provider.schedule(createTask('report'))

      const status = provider.getStatus('report')

      expect(status).toEqual({
        name: 'report',
        lastRunAt: null,
        nextRunAt: null,
        isRunning: false,
        lastError: null,
        durationMs: null,
        totalRuns: 0,
        totalFailures: 0,
        lastSuccessAt: null,
        enabled: true,
      })
    })
  })

  describe('task replacement', () => {
    it('should replace a task with the same name', async () => {
      const provider = createProvider()
      const handler1 = vi.fn().mockResolvedValue(undefined)
      const handler2 = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('cleanup', { handler: handler1 }))
      provider.start()

      // Let first task run
      await vi.advanceTimersByTimeAsync(1)
      expect(handler1).toHaveBeenCalledTimes(1)

      // Replace with new handler
      provider.schedule(createTask('cleanup', { handler: handler2 }))

      // Advance past stagger delay for the replacement task
      await vi.advanceTimersByTimeAsync(2001)

      expect(handler2).toHaveBeenCalled()
    })

    it('should stop the old timer when replacing', async () => {
      const provider = createProvider()
      const handler1 = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('cleanup', { handler: handler1, intervalMs: 5000 }))
      provider.start()

      // Let first task run and set up interval
      await vi.advanceTimersByTimeAsync(1)
      expect(handler1).toHaveBeenCalledTimes(1)

      // Replace the task
      const handler2 = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('cleanup', { handler: handler2, intervalMs: 5000 }))

      // Advance so the old interval would have fired, but only the new handler should run
      await vi.advanceTimersByTimeAsync(5001)
      // handler1 should not have been called again via the old interval
      expect(handler1).toHaveBeenCalledTimes(1)
    })
  })

  describe('start', () => {
    it('should begin running scheduled tasks', async () => {
      const provider = createProvider()
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('cleanup', { handler, intervalMs: 5000 }))

      provider.start()

      // First task has stagger index 0, so delay = 0ms
      // Advance to trigger the setTimeout(0) and first run
      await vi.advanceTimersByTimeAsync(1)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should run tasks repeatedly at their interval', async () => {
      const provider = createProvider()
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('cleanup', { handler, intervalMs: 5000 }))

      provider.start()

      // Initial run (stagger delay 0 for first task)
      await vi.advanceTimersByTimeAsync(1)
      expect(handler).toHaveBeenCalledTimes(1)

      // Wait for next interval
      await vi.advanceTimersByTimeAsync(5000)
      expect(handler).toHaveBeenCalledTimes(2)

      // Wait for another interval
      await vi.advanceTimersByTimeAsync(5000)
      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('should set nextRunAt after scheduling and starting', () => {
      const provider = createProvider()
      provider.schedule(createTask('cleanup'))

      provider.start()

      const status = provider.getStatus('cleanup')
      expect(status!.nextRunAt).not.toBeNull()
    })
  })

  describe('stop', () => {
    it('should prevent further task runs', async () => {
      const provider = createProvider()
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('cleanup', { handler, intervalMs: 5000 }))

      provider.start()
      await vi.advanceTimersByTimeAsync(1)
      expect(handler).toHaveBeenCalledTimes(1)

      provider.stop()

      // Advance well past the interval
      await vi.advanceTimersByTimeAsync(30000)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should clear nextRunAt for all tasks', async () => {
      const provider = createProvider()
      provider.schedule(createTask('task-a'))
      provider.schedule(createTask('task-b'))

      provider.start()
      provider.stop()

      const statuses = provider.getAllStatuses()
      for (const status of statuses) {
        expect(status.nextRunAt).toBeNull()
      }
    })
  })

  describe('disabled tasks', () => {
    it('should not start disabled tasks on start()', async () => {
      const provider = createProvider()
      const enabledHandler = vi.fn().mockResolvedValue(undefined)
      const disabledHandler = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('enabled-task', { handler: enabledHandler }))
      provider.schedule(createTask('disabled-task', { handler: disabledHandler, enabled: false }))

      provider.start()

      // Advance past stagger for both tasks
      await vi.advanceTimersByTimeAsync(5000)

      expect(enabledHandler).toHaveBeenCalled()
      expect(disabledHandler).not.toHaveBeenCalled()
    })

    it('should still be visible in getStatus for disabled tasks', () => {
      const provider = createProvider()
      provider.schedule(createTask('disabled-task', { enabled: false }))

      const status = provider.getStatus('disabled-task')

      expect(status).not.toBeNull()
      expect(status!.name).toBe('disabled-task')
    })
  })

  describe('error isolation', () => {
    it('should not affect other tasks when one throws', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const failingHandler = vi.fn().mockRejectedValue(new Error('Task failed'))
      const succeedingHandler = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('failing', { handler: failingHandler, intervalMs: 5000 }))
      provider.schedule(createTask('succeeding', { handler: succeedingHandler, intervalMs: 5000 }))

      provider.start()

      // Let both tasks run (stagger is 0)
      await vi.advanceTimersByTimeAsync(1)

      expect(failingHandler).toHaveBeenCalledTimes(1)
      expect(succeedingHandler).toHaveBeenCalledTimes(1)
    })

    it('should log error when a task fails', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const failingHandler = vi.fn().mockRejectedValue(new Error('Something broke'))

      provider.schedule(createTask('failing', { handler: failingHandler }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Scheduler task 'failing' failed: Something broke",
      )
    })
  })

  describe('lastError', () => {
    it('should capture error message on task failure', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockRejectedValue(new Error('DB connection lost'))

      provider.schedule(createTask('sync', { handler }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)

      const status = provider.getStatus('sync')
      expect(status!.lastError).toBe('DB connection lost')
    })

    it('should capture non-Error thrown values as strings', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockRejectedValue('string error')

      provider.schedule(createTask('sync', { handler }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)

      const status = provider.getStatus('sync')
      expect(status!.lastError).toBe('string error')
    })

    it('should clear lastError on successful run after failure', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValue(undefined)

      provider.schedule(createTask('sync', { handler, intervalMs: 5000 }))
      provider.start()

      // First run fails
      await vi.advanceTimersByTimeAsync(1)
      expect(provider.getStatus('sync')!.lastError).toBe('temporary error')

      // Second run succeeds
      await vi.advanceTimersByTimeAsync(5000)
      expect(provider.getStatus('sync')!.lastError).toBeNull()
    })
  })

  describe('lastRunAt and nextRunAt', () => {
    it('should update lastRunAt after a task runs', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('sync', { handler, intervalMs: 10000 }))
      provider.start()

      // Before run
      expect(provider.getStatus('sync')!.lastRunAt).toBeNull()

      // After run
      await vi.advanceTimersByTimeAsync(1)
      const status = provider.getStatus('sync')
      expect(status!.lastRunAt).not.toBeNull()
      expect(new Date(status!.lastRunAt!).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should update nextRunAt after a task runs', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('sync', { handler, intervalMs: 10000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)

      const status = provider.getStatus('sync')
      expect(status!.nextRunAt).not.toBeNull()

      // nextRunAt should be roughly Date.now() + intervalMs
      const nextRun = new Date(status!.nextRunAt!).getTime()
      const expectedNext = Date.now() + 10000
      // Allow 100ms tolerance for test execution time
      expect(Math.abs(nextRun - expectedNext)).toBeLessThan(100)
    })
  })

  describe('stagger', () => {
    it('should start tasks with staggered delays using default staggerMs', async () => {
      const provider = createProvider() // default staggerMs = 2000
      const handler1 = vi.fn().mockResolvedValue(undefined)
      const handler2 = vi.fn().mockResolvedValue(undefined)
      const handler3 = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('task-0', { handler: handler1 }))
      provider.schedule(createTask('task-1', { handler: handler2 }))
      provider.schedule(createTask('task-2', { handler: handler3 }))

      provider.start()

      // First task: stagger index 0, delay 0ms
      await vi.advanceTimersByTimeAsync(1)
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()
      expect(handler3).not.toHaveBeenCalled()

      // Second task: stagger index 1, delay 2000ms
      await vi.advanceTimersByTimeAsync(2000)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).not.toHaveBeenCalled()

      // Third task: stagger index 2, delay 4000ms (2000 more from where we are)
      await vi.advanceTimersByTimeAsync(2000)
      expect(handler3).toHaveBeenCalledTimes(1)
    })

    it('should respect custom staggerMs option', async () => {
      const provider = createProvider({ staggerMs: 500 })
      const handler1 = vi.fn().mockResolvedValue(undefined)
      const handler2 = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('task-0', { handler: handler1 }))
      provider.schedule(createTask('task-1', { handler: handler2 }))

      provider.start()

      // First task runs immediately (stagger index 0, delay 0)
      await vi.advanceTimersByTimeAsync(1)
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()

      // Second task at 500ms
      await vi.advanceTimersByTimeAsync(500)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('double start', () => {
    it('should be a no-op when already started', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)

      provider.schedule(createTask('cleanup', { handler, intervalMs: 5000 }))

      provider.start()
      provider.start() // second call should be no-op

      await vi.advanceTimersByTimeAsync(1)

      // Handler should only have been called once, not twice
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('concurrent run guard', () => {
    it('should skip execution if previous run is still in progress', async () => {
      const provider = createProvider({ staggerMs: 0 })
      let resolveHandler: () => void
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveHandler = resolve
          }),
      )

      provider.schedule(createTask('slow', { handler, intervalMs: 100 }))
      provider.start()

      // Start first run
      await vi.advanceTimersByTimeAsync(1)
      expect(handler).toHaveBeenCalledTimes(1)

      // Trigger next interval while first is still running — guard skips execution
      await vi.advanceTimersByTimeAsync(100)
      expect(handler).toHaveBeenCalledTimes(1) // still 1, guard prevented re-entry

      // Status should show isRunning true since first hasn't resolved
      const status = provider.getStatus('slow')
      expect(status!.isRunning).toBe(true)

      // Resolve the first handler
      resolveHandler!()
      await vi.advanceTimersByTimeAsync(1)

      const statusAfter = provider.getStatus('slow')
      expect(statusAfter!.isRunning).toBe(false)

      // Now the next interval should successfully call handler again
      await vi.advanceTimersByTimeAsync(100)
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('analytics fields', () => {
    it('should track durationMs after task execution', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi
        .fn()
        .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))
      provider.schedule(createTask('slow', { handler, intervalMs: 10000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)
      // Advance the 50ms setTimeout inside the handler
      await vi.advanceTimersByTimeAsync(50)

      const status = provider.getStatus('slow')
      expect(status!.durationMs).toBeGreaterThanOrEqual(0)
      expect(typeof status!.durationMs).toBe('number')
    })

    it('should increment totalRuns on each execution', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('counter', { handler, intervalMs: 5000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)
      expect(provider.getStatus('counter')!.totalRuns).toBe(1)

      await vi.advanceTimersByTimeAsync(5000)
      expect(provider.getStatus('counter')!.totalRuns).toBe(2)

      await vi.advanceTimersByTimeAsync(5000)
      expect(provider.getStatus('counter')!.totalRuns).toBe(3)
    })

    it('should increment totalFailures only on errors', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined)

      provider.schedule(createTask('mixed', { handler, intervalMs: 5000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1) // run 1: success
      expect(provider.getStatus('mixed')!.totalRuns).toBe(1)
      expect(provider.getStatus('mixed')!.totalFailures).toBe(0)

      await vi.advanceTimersByTimeAsync(5000) // run 2: failure
      expect(provider.getStatus('mixed')!.totalRuns).toBe(2)
      expect(provider.getStatus('mixed')!.totalFailures).toBe(1)

      await vi.advanceTimersByTimeAsync(5000) // run 3: success
      expect(provider.getStatus('mixed')!.totalRuns).toBe(3)
      expect(provider.getStatus('mixed')!.totalFailures).toBe(1)
    })

    it('should track lastSuccessAt on successful runs', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('tracked', { handler, intervalMs: 10000 }))
      provider.start()

      expect(provider.getStatus('tracked')!.lastSuccessAt).toBeNull()

      await vi.advanceTimersByTimeAsync(1)
      const status = provider.getStatus('tracked')
      expect(status!.lastSuccessAt).not.toBeNull()
      expect(new Date(status!.lastSuccessAt!).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should not update lastSuccessAt on failed runs', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'))

      provider.schedule(createTask('tracked', { handler, intervalMs: 5000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1) // success
      const successAt = provider.getStatus('tracked')!.lastSuccessAt

      await vi.advanceTimersByTimeAsync(5000) // failure
      expect(provider.getStatus('tracked')!.lastSuccessAt).toBe(successAt)
    })

    it('should expose enabled status for enabled tasks', () => {
      const provider = createProvider()
      provider.schedule(createTask('active'))

      expect(provider.getStatus('active')!.enabled).toBe(true)
    })

    it('should expose enabled status for disabled tasks', () => {
      const provider = createProvider()
      provider.schedule(createTask('inactive', { enabled: false }))

      expect(provider.getStatus('inactive')!.enabled).toBe(false)
    })

    it('should include analytics fields in getAllStatuses', async () => {
      const provider = createProvider({ staggerMs: 0 })
      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('task-a', { handler, intervalMs: 10000 }))
      provider.start()

      await vi.advanceTimersByTimeAsync(1)

      const statuses = provider.getAllStatuses()
      expect(statuses[0].totalRuns).toBe(1)
      expect(statuses[0].totalFailures).toBe(0)
      expect(statuses[0].durationMs).toBeGreaterThanOrEqual(0)
      expect(statuses[0].lastSuccessAt).not.toBeNull()
      expect(statuses[0].enabled).toBe(true)
    })
  })

  describe('scheduling after start', () => {
    it('should immediately start a task scheduled after start()', async () => {
      const provider = createProvider({ staggerMs: 0 })
      provider.start()

      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('late-task', { handler }))

      // The task is scheduled with a setTimeout stagger, advance to trigger it
      await vi.advanceTimersByTimeAsync(1)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should not start a disabled task scheduled after start()', async () => {
      const provider = createProvider({ staggerMs: 0 })
      provider.start()

      const handler = vi.fn().mockResolvedValue(undefined)
      provider.schedule(createTask('disabled-late', { handler, enabled: false }))

      await vi.advanceTimersByTimeAsync(5000)

      expect(handler).not.toHaveBeenCalled()
    })
  })
})
