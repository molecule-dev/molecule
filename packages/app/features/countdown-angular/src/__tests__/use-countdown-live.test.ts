// @vitest-environment jsdom

/**
 * The live behavior of {@link useCountdown}: each interval tick reads the clock
 * again, and a target change reads it afresh, as React's hook does. The hook is
 * called in a host's field initialiser, as an app calls it, and a target change
 * is a signal set — the way a component re-rendering with a new `target` input
 * reaches it.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import { useCountdown } from '../useCountdown.js'

/** What one call of the function returns. */
type Countdown = ReturnType<typeof useCountdown>

/**
 * The countdown's fields as plain data.
 *
 * @param s - The function's result.
 * @returns The state, read from its signals.
 */
const read = (s: Countdown): Record<string, unknown> => ({
  days: s.days(),
  hours: s.hours(),
  minutes: s.minutes(),
  seconds: s.seconds(),
  msRemaining: s.msRemaining(),
  expired: s.expired(),
})

/** A mounted host: its element, a change-detection tick and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass, flushing the effects it schedules. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** A live countdown: what the host captured plus the signals a test drives. */
interface Live {
  /** The mounted host. */
  readonly mounted: Mounted
  /** The hook's result, read from the host. */
  readonly countdown: Countdown
  /** Every result the host's initialiser produced; a re-render must not add one. */
  readonly captures: Countdown[]
  /** The target the hook follows. */
  readonly target: WritableSignal<number>
  /** An unrelated signal the template reads, so a test can force a re-render. */
  readonly nonce: WritableSignal<number>
}

const mounted: Mounted[] = []

/**
 * Mounts a host component through Angular's real renderer and ticks it once.
 *
 * @param host - The host component type.
 * @returns The mounted host.
 */
async function mountHost(host: Type<unknown>): Promise<Mounted> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  const element = ref.location.nativeElement as HTMLElement
  document.body.appendChild(element)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host: element,
    tick: () => appRef.tick(),
    destroy: async () => {
      ref.destroy()
      element.remove()
      await appRef.destroy()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * Mounts a host whose field initialiser calls the hook with `target`, and whose
 * template renders an unrelated signal (`nonce`).
 *
 * @param initialTarget - The target epoch milliseconds the hook starts with.
 * @param tickMs - The refresh interval.
 * @returns The mounted host and the sources a test drives.
 */
async function mountLive(initialTarget: number, tickMs: number): Promise<Live> {
  const target = signal(initialTarget)
  const nonce = signal(0)
  const captures: Countdown[] = []
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-live-host',
    standalone: true,
    template: `<span data-render>{{ nonce() }}</span>`,
  })(
    class LiveHost {
      /** The target the hook follows. */
      readonly target = target
      /** An unrelated signal the template reads. */
      readonly nonce = nonce
      /** The hook's result, created once in the component's injection context. */
      readonly countdown = (() => {
        const s = useCountdown(this.target, tickMs)
        captures.push(s)
        return s
      })()
    },
  ) as Type<unknown>
  const host = await mountHost(Host)
  const countdown = captures[0]
  if (!countdown) throw new Error('the host initialiser did not run the hook')
  return { mounted: host, countdown, captures, target, nonce }
}

/**
 * Lets Angular's zoneless scheduler run the work a changed signal queued: it
 * fires on a zero-length timer, which the faked clock runs here, and the tick it
 * schedules flushes the effects.
 *
 * @returns A promise resolved once the scheduler has run.
 */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown (live)', () => {
  it('re-derives the countdown from the clock on each interval tick', async () => {
    const live = await mountLive(10_000, 1_000)
    expect(read(live.countdown)).toMatchObject({
      seconds: 10,
      msRemaining: 10_000,
      expired: false,
    })

    vi.advanceTimersByTime(3_000)

    expect(read(live.countdown)).toMatchObject({ seconds: 7, msRemaining: 7_000, expired: false })
  })

  it('flags expiry once the target passes under a running interval', async () => {
    const live = await mountLive(2_000, 1_000)
    vi.advanceTimersByTime(2_000)
    expect(read(live.countdown).expired).toBe(true)
    expect(read(live.countdown).msRemaining).toBeLessThanOrEqual(0)
  })

  it('reads the clock afresh when the target changes between ticks', async () => {
    const live = await mountLive(10_000, 1_000)
    expect(read(live.countdown).seconds).toBe(10)

    // Half a tick after the 1000 ms tick, the clock reads 1500 ms.
    vi.advanceTimersByTime(1_500)
    expect(read(live.countdown).msRemaining).toBe(9_000)

    // A new target reads the clock now, not at the last tick: 5000 − 1500 = 3500 ms.
    live.target.set(5_000)
    await flush()
    expect(read(live.countdown)).toMatchObject({ seconds: 3, msRemaining: 3_500, expired: false })

    // The interval restarts with the target, so the next tick lands a full tick later.
    vi.advanceTimersByTime(1_000)
    expect(read(live.countdown).msRemaining).toBe(2_500)
  })

  it('reads the clock afresh on a target change when tickMs is 0', async () => {
    const live = await mountLive(10_000, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(live.countdown).seconds).toBe(10)

    live.target.set(20_000)
    await flush()
    expect(read(live.countdown)).toMatchObject({ seconds: 15, msRemaining: 15_000 })
  })

  it('keeps the same object between ticks', async () => {
    const live = await mountLive(10_000, 1_000)
    expect(live.captures).toHaveLength(1)
    const first = live.captures[0]

    // An unrelated re-render (React's `rerender()` with no changed prop) must not
    // build a new countdown: the field initialiser runs once, so its result is kept.
    live.nonce.set(1)
    await flush()
    expect(live.mounted.host.textContent).toBe('1')
    expect(live.captures).toHaveLength(1)
    expect(live.captures[0]).toBe(first)

    // The kept object is still the live one: its signals follow the clock.
    vi.advanceTimersByTime(1_000)
    expect(read(first).msRemaining).toBe(9_000)
  })

  it('leaves the clock reading frozen when tickMs is 0', async () => {
    const live = await mountLive(10_000, 0)
    vi.advanceTimersByTime(5_000)
    expect(read(live.countdown).seconds).toBe(10)
  })
})
