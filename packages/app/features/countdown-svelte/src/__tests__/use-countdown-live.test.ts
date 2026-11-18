// @vitest-environment jsdom

/**
 * The live behavior of {@link useCountdown}: each interval tick reads the clock
 * again, and a target change reads it afresh, as React's hook does.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { useCountdown } from '../useCountdown.js'

const { default: LiveProbe } = await import('./LiveProbe.svelte')

/** What one call of the hook returns. */
type Countdown = ReturnType<typeof useCountdown>

/** The props the live probe takes. */
interface LiveProps {
  /** The target store the hook follows. */
  target: Readable<number>
  /** The refresh interval store the hook follows. */
  tick: Readable<number>
  /** An unrelated store whose change re-renders the probe. */
  nonce: Readable<number>
  /** Receives the hook's result once, at init. */
  onready?: (countdown: Countdown) => void
}

const mounted: Array<ReturnType<typeof mount>> = []

/**
 * Mounts the live probe and flushes its first render.
 *
 * @param props - The probe's props.
 * @returns The document body's markup.
 */
function render(props: LiveProps): string {
  mounted.push(mount(LiveProbe, { target: document.body, props }))
  flushSync()
  return document.body.innerHTML
}

/**
 * The countdown state the probe rendered, as plain data.
 *
 * @returns The state the probe's `data-state` node carries.
 */
function stateOf(): Record<string, unknown> {
  const text = document.querySelector('[data-state]')?.textContent ?? '{}'
  return JSON.parse(text) as Record<string, unknown>
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown (live)', () => {
  it('re-derives the countdown from the clock on each interval tick', () => {
    render({ target: writable(10_000), tick: writable(1_000), nonce: writable(0) })
    expect(stateOf()).toMatchObject({ seconds: 10, msRemaining: 10_000, expired: false })

    vi.advanceTimersByTime(3_000)
    flushSync()

    expect(stateOf()).toMatchObject({ seconds: 7, msRemaining: 7_000, expired: false })
  })

  it('flags expiry once the target passes under a running interval', () => {
    render({ target: writable(2_000), tick: writable(1_000), nonce: writable(0) })
    vi.advanceTimersByTime(2_000)
    flushSync()
    expect(stateOf().expired).toBe(true)
    expect(stateOf().msRemaining).toBeLessThanOrEqual(0)
  })

  it('reads the clock afresh when the target changes between ticks', () => {
    const target = writable(10_000)
    render({ target, tick: writable(1_000), nonce: writable(0) })
    expect(stateOf().seconds).toBe(10)

    // Half a tick after the 1000 ms tick, the clock reads 1500 ms.
    vi.advanceTimersByTime(1_500)
    flushSync()
    expect(stateOf().msRemaining).toBe(9_000)

    // A new target reads the clock now, not at the last tick: 5000 − 1500 = 3500 ms.
    target.set(5_000)
    flushSync()
    expect(stateOf()).toMatchObject({ seconds: 3, msRemaining: 3_500, expired: false })

    // The interval restarts with the target, so the next tick lands a full tick later.
    vi.advanceTimersByTime(1_000)
    flushSync()
    expect(stateOf().msRemaining).toBe(2_500)
  })

  it('reads the clock afresh on a target change when tickMs is 0', () => {
    const target = writable(10_000)
    render({ target, tick: writable(0), nonce: writable(0) })
    vi.advanceTimersByTime(5_000)
    flushSync()
    expect(stateOf().seconds).toBe(10)

    target.set(20_000)
    flushSync()
    expect(stateOf()).toMatchObject({ seconds: 15, msRemaining: 15_000 })
  })

  it('keeps the same object between ticks', () => {
    const captured: Countdown[] = []
    const nonce = writable(0)
    render({
      target: writable(10_000),
      tick: writable(1_000),
      nonce,
      onready: (countdown: Countdown) => captured.push(countdown),
    })
    expect(captured).toHaveLength(1)
    const first = captured[0]

    // An unrelated re-render (React's `rerender()` with no changed prop) must not
    // build a new countdown: init runs once, so the hook's result is kept.
    nonce.set(1)
    flushSync()
    expect(document.querySelector('[data-render]')?.textContent).toBe('1')
    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe(first)

    // The kept stores are still the live ones: they follow the clock.
    vi.advanceTimersByTime(1_000)
    flushSync()
    expect(get(first.msRemaining)).toBe(9_000)
  })

  it('leaves the clock reading frozen when tickMs is 0', () => {
    render({ target: writable(10_000), tick: writable(0), nonce: writable(0) })
    vi.advanceTimersByTime(5_000)
    flushSync()
    expect(stateOf().seconds).toBe(10)
  })
})
