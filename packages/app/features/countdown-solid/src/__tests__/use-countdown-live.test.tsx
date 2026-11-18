// @vitest-environment jsdom

/**
 * The live behavior of {@link useCountdown}: each interval tick reads the clock
 * again, and a target change reads it afresh, as React's hook does.
 *
 * @module
 */

import { type Accessor, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCountdown } from '../useCountdown.js'

/** What one call of the primitive returns. */
type Countdown = ReturnType<typeof useCountdown>

/**
 * The countdown's fields as plain data.
 *
 * @param s - The primitive's result.
 * @returns The state, read from its accessors.
 */
const read = (s: Countdown): Record<string, unknown> => ({
  days: s.days(),
  hours: s.hours(),
  minutes: s.minutes(),
  seconds: s.seconds(),
  msRemaining: s.msRemaining(),
  expired: s.expired(),
})

const disposers: Array<() => void> = []

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The container it rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Calls the primitive inside a component, the way an app does, and returns its
 * result — the target may be a plain value or an accessor.
 *
 * @param target - The target epoch milliseconds, or an accessor of them.
 * @param tickMs - The refresh interval.
 * @returns The primitive's result.
 */
function useLive(target: number | Accessor<number>, tickMs: number): Countdown {
  const results: Countdown[] = []
  /**
   * Minimal Solid component that calls the primitive and renders nothing.
   *
   * @returns An empty span.
   */
  function Probe(): JSX.Element {
    results.push(useCountdown(target, tickMs))
    return <span />
  }
  mount(() => <Probe />)
  const result = results[0]
  if (!result) throw new Error('the probe component did not run')
  return result
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown (live)', () => {
  it('re-derives the countdown from the clock on each interval tick', () => {
    const s = useLive(10_000, 1_000)
    expect(read(s)).toMatchObject({ seconds: 10, msRemaining: 10_000, expired: false })

    vi.advanceTimersByTime(3_000)

    expect(read(s)).toMatchObject({ seconds: 7, msRemaining: 7_000, expired: false })
  })

  it('flags expiry once the target passes under a running interval', () => {
    const s = useLive(2_000, 1_000)
    vi.advanceTimersByTime(2_000)
    expect(read(s).expired).toBe(true)
    expect(read(s).msRemaining).toBeLessThanOrEqual(0)
  })

  it('reads the clock afresh when the target changes between ticks', () => {
    const [target, setTarget] = createSignal(10_000)
    const s = useLive(target, 1_000)
    expect(read(s).seconds).toBe(10)

    // Half a tick after the 1000 ms tick, the clock reads 1500 ms.
    vi.advanceTimersByTime(1_500)
    expect(read(s).msRemaining).toBe(9_000)

    // A new target reads the clock now, not at the last tick: 5000 − 1500 = 3500 ms.
    setTarget(5_000)
    expect(read(s)).toMatchObject({ seconds: 3, msRemaining: 3_500, expired: false })

    // The interval restarts with the target, so the next tick lands a full tick later.
    vi.advanceTimersByTime(1_000)
    expect(read(s).msRemaining).toBe(2_500)
  })

  it('reads the clock afresh on a target change when tickMs is 0', () => {
    const [target, setTarget] = createSignal(10_000)
    const s = useLive(target, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(s).seconds).toBe(10)

    setTarget(20_000)
    expect(read(s)).toMatchObject({ seconds: 15, msRemaining: 15_000 })
  })

  it('keeps the same object between ticks', () => {
    const [nonce, setNonce] = createSignal(0)
    const results: Countdown[] = []
    /**
     * A component that calls the primitive once and re-renders on `nonce`.
     *
     * @returns The nonce text.
     */
    function Probe(): JSX.Element {
      results.push(useCountdown(10_000, 1_000))
      return <span data-render>{nonce()}</span>
    }
    const container = mount(() => <Probe />)
    expect(results).toHaveLength(1)
    const first = results[0]

    // An unrelated re-render (React's `rerender()` with no changed prop) must not
    // build a new countdown: a component body runs once, so the result is kept.
    setNonce(1)
    expect(container.textContent).toBe('1')
    expect(results).toHaveLength(1)
    expect(results[0]).toBe(first)

    // The kept object is still the live one: its accessors follow the clock.
    vi.advanceTimersByTime(1_000)
    expect(read(first).msRemaining).toBe(9_000)
  })

  it('leaves the clock reading frozen when tickMs is 0', () => {
    const s = useLive(10_000, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(s).seconds).toBe(10)
  })
})
