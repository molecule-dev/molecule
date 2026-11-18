// @vitest-environment jsdom

/**
 * The live behavior of {@link useCountdown}: each interval tick reads the clock
 * again, and a target change reads it afresh, as React's hook does.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component, createApp, defineComponent, h, nextTick, type Ref, ref } from 'vue'

import { useCountdown } from '../useCountdown.js'

/** What one call of the composable returns. */
type Countdown = ReturnType<typeof useCountdown>

/**
 * The countdown's fields as plain data.
 *
 * @param s - The composable's result.
 * @returns The state, read from its computed refs.
 */
const read = (s: Countdown): Record<string, unknown> => ({
  days: s.days.value,
  hours: s.hours.value,
  minutes: s.minutes.value,
  seconds: s.seconds.value,
  msRemaining: s.msRemaining.value,
  expired: s.expired.value,
})

const mounted: Array<() => void> = []

/**
 * Mounts a component into a fresh container and returns the container.
 *
 * @param component - The component to mount.
 * @returns The container the app rendered into.
 */
const mount = (component: Component): HTMLElement => {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp(component)
  app.mount(container)
  mounted.push(() => app.unmount())
  return container
}

/**
 * Calls the composable inside a component's setup, the way an app does, and
 * returns its result — the target and tick may each be a plain value or a ref.
 *
 * @param target - The target epoch milliseconds, or a ref of them.
 * @param tickMs - The refresh interval, or a ref of it.
 * @returns The composable's result.
 */
function useLive(target: number | Ref<number>, tickMs: number | Ref<number>): Countdown {
  const results: Countdown[] = []
  mount(
    defineComponent({
      setup() {
        results.push(useCountdown(target, tickMs))
        return () => null
      },
    }),
  )
  const result = results[0]
  if (!result) throw new Error('the probe component did not run its setup')
  return result
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
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

  it('reads the clock afresh when the target changes between ticks', async () => {
    const target = ref(10_000)
    const s = useLive(target, 1_000)
    expect(read(s).seconds).toBe(10)

    // Half a tick after the 1000 ms tick, the clock reads 1500 ms.
    vi.advanceTimersByTime(1_500)
    expect(read(s).msRemaining).toBe(9_000)

    // A new target reads the clock now, not at the last tick: 5000 − 1500 = 3500 ms.
    target.value = 5_000
    await nextTick()
    expect(read(s)).toMatchObject({ seconds: 3, msRemaining: 3_500, expired: false })

    // The interval restarts with the target, so the next tick lands a full tick later.
    vi.advanceTimersByTime(1_000)
    expect(read(s).msRemaining).toBe(2_500)
  })

  it('reads the clock afresh on a target change when tickMs is 0', async () => {
    const target = ref(10_000)
    const s = useLive(target, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(s).seconds).toBe(10)

    target.value = 20_000
    await nextTick()
    expect(read(s)).toMatchObject({ seconds: 15, msRemaining: 15_000 })
  })

  it('keeps the same object between ticks', async () => {
    const nonce = ref(0)
    const results: Countdown[] = []
    const Child = defineComponent({
      setup() {
        results.push(useCountdown(10_000, 1_000))
        return () => h('span', { 'data-render': '' }, `${nonce.value}`)
      },
    })
    const container = mount(defineComponent({ setup: () => () => h(Child, {}) }))
    expect(results).toHaveLength(1)
    const first = results[0]

    // An unrelated re-render (React's `rerender()` with no changed prop) must not
    // build a new countdown: `setup` runs once, so the composable's result is kept.
    nonce.value = 1
    await nextTick()
    expect(container.textContent).toBe('1')
    expect(results).toHaveLength(1)
    expect(results[0]).toBe(first)

    // The kept object is still the live one: its fields follow the clock.
    vi.advanceTimersByTime(1_000)
    expect(read(first).msRemaining).toBe(9_000)
  })

  it('leaves the clock reading frozen when tickMs is 0', () => {
    const s = useLive(10_000, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(s).seconds).toBe(10)
  })
})
