/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: after `start()` the task runs right
 * away, then again every `intervalMs`.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStatus, schedule, setProvider, start, stop } from '@molecule/api-scheduler'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    stop()
    vi.useRealTimers()
  })

  it('runs the task immediately after start(), then every intervalMs', async () => {
    vi.useFakeTimers()
    setProvider(createProvider({ staggerMs: 2000 }))

    let purged = 0
    schedule({
      name: 'purge-expired-sessions',
      intervalMs: 15 * 60_000,
      async handler() {
        purged++
      },
    })

    await vi.advanceTimersByTimeAsync(60_000)
    expect(purged).toBe(0) // nothing runs before start()

    start()
    await vi.advanceTimersByTimeAsync(0)
    expect(purged).toBe(1)
    expect(getStatus('purge-expired-sessions')).toMatchObject({ totalRuns: 1, lastError: null })

    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(purged).toBe(2)

    stop()
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(purged).toBe(2)
  })
})
