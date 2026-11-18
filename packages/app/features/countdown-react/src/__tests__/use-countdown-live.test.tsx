// @vitest-environment jsdom

/**
 * The live behavior of {@link useCountdown}: each interval tick reads the clock
 * again, and a target change reads it afresh, as the other frameworks' countdowns do.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCountdown } from '../useCountdown.js'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown (live)', () => {
  it('re-derives the countdown from the clock on each interval tick', () => {
    const { result } = renderHook(() => useCountdown(10_000, 1_000))
    expect(result.current).toMatchObject({ seconds: 10, msRemaining: 10_000, expired: false })

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(result.current).toMatchObject({ seconds: 7, msRemaining: 7_000, expired: false })
  })

  it('flags expiry once the target passes under a running interval', () => {
    const { result } = renderHook(() => useCountdown(2_000, 1_000))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.expired).toBe(true)
    expect(result.current.msRemaining).toBeLessThanOrEqual(0)
  })

  it('reads the clock afresh when the target changes between ticks', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountdown(target, 1_000),
      { initialProps: { target: 10_000 } },
    )
    expect(result.current.seconds).toBe(10)

    // Half a tick after the 1000 ms tick, the clock reads 1500 ms.
    act(() => {
      vi.advanceTimersByTime(1_500)
    })
    expect(result.current.msRemaining).toBe(9_000)

    // A new target reads the clock now, not at the last tick: 5000 − 1500 = 3500 ms.
    rerender({ target: 5_000 })
    expect(result.current).toMatchObject({ seconds: 3, msRemaining: 3_500, expired: false })

    // The interval restarts with the target, so the next tick lands a full tick later.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.msRemaining).toBe(2_500)
  })

  it('reads the clock afresh on a target change when tickMs is 0', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountdown(target, 0),
      { initialProps: { target: 10_000 } },
    )
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(result.current.seconds).toBe(10)

    rerender({ target: 20_000 })
    expect(result.current).toMatchObject({ seconds: 15, msRemaining: 15_000 })
  })

  it('keeps the same object between ticks', () => {
    const { result, rerender } = renderHook(() => useCountdown(10_000, 1_000))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('leaves the clock reading frozen when tickMs is 0', () => {
    const { result } = renderHook(() => useCountdown(10_000, 0))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(result.current.seconds).toBe(10)
  })
})
