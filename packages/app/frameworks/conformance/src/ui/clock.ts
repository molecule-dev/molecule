/**
 * A case's clock: the fake timers a case runs on, and how a step moves them.
 *
 * An `advance` step fires the timer callbacks that fall due one at a time, and after each one
 * lets the framework render and run its effects (inside the scope the adapter gives, React's
 * `act`), as a browser renders between timer tasks. Advancing all of them inside one scope
 * would record states no user sees: a timer whose effect would have cancelled the next one
 * still lets that one fire. Two timers due at the same instant get a render in between too,
 * the one order every framework can share.
 *
 * @module
 */

import { vi } from 'vitest'

import { pinCaseTimeZone } from './page.js'

/** Runs one piece of clock work inside a framework's update scope (React's `act`). */
export type ClockScope = (work: () => Promise<void>) => Promise<void>

/** The parts of the fake clock (`@sinonjs/fake-timers`, which `vi.useFakeTimers` installs) the kit drives. */
interface FakeClock {
  now: number
  timers?: Record<string, { callAt: number }>
  nextAsync(): Promise<number>
  tickAsync(ms: number): Promise<number>
}

/**
 * More timer callbacks than this in one advance means a timer or frame loop keeps re-arming (a
 * timer re-armed with no delay while timers run gets 1 ms, as browsers clamp nested timeouts).
 */
export const MAX_TIMERS_PER_ADVANCE = 100_000

/**
 * Whether a value is the fake clock.
 *
 * @param value - `setTimeout.clock`.
 * @returns True for the fake clock.
 */
function isFakeClock(value: unknown): value is FakeClock {
  return (
    typeof value === 'object' &&
    value !== null &&
    'now' in value &&
    typeof value.now === 'number' &&
    'nextAsync' in value &&
    typeof value.nextAsync === 'function' &&
    'tickAsync' in value &&
    typeof value.tickAsync === 'function'
  )
}

/**
 * The fake clock behind the faked `setTimeout`, or null when timers are real (a case that fakes
 * only `Date`, or none).
 *
 * @returns The clock.
 */
function timerClock(): FakeClock | null {
  if (!vi.isFakeTimers()) return null
  const clock: unknown = Reflect.get(globalThis.setTimeout, 'clock')
  if (clock === undefined) return null
  if (!isFakeClock(clock))
    throw new Error(
      'conformance: the faked setTimeout carries no clock the kit can step (setTimeout.clock); a vitest upgrade changed its fake timers',
    )
  return clock
}

/**
 * Moves the case's clock forward by `ms`. Each timer callback due by then runs alone inside
 * `scope`, so the framework renders and runs its effects before the next one; a timer created
 * on the way fires when it is due before the end. `Date.now()` ends at the start plus `ms`.
 *
 * @param ms - How far to move the clock.
 * @param scope - The framework's update scope; without one each callback runs directly.
 * @param limit - The most callbacks the advance may run before it fails.
 */
export async function advanceClock(
  ms: number,
  scope: ClockScope = (work) => work(),
  limit = MAX_TIMERS_PER_ADVANCE,
): Promise<void> {
  const clock = timerClock()
  if (!clock) {
    // No timers are faked: only `Date` (or nothing) moves, and no callback is due.
    await scope(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
    return
  }
  const target = clock.now + ms
  const due = (): boolean => Object.values(clock.timers ?? {}).some((t) => t.callAt <= target)
  let fired = 0
  while (due()) {
    if (++fired > limit)
      throw new Error(
        `conformance: more than ${limit} timer callbacks in one ${ms} ms advance; a timer or frame loop keeps re-arming`,
      )
    await scope(async () => {
      await clock.nextAsync()
    })
  }
  if (clock.now < target)
    await scope(async () => {
      await clock.tickAsync(target - clock.now)
    })
}

/**
 * Installs a case's clock before mount: the UTC time zone, fake timers (`fakeTimers`,
 * for `advance` steps) and a pinned `Date.now()` (`now`). With `now` alone only `Date` is faked, so a
 * component's real timers still run. Undone with `vi.useRealTimers()`.
 *
 * @param testCase - The case (UI or hook).
 * @param testCase.fakeTimers - Whether to fake timers too.
 * @param testCase.now - The epoch milliseconds `Date.now()` starts at.
 */
export function installCaseClock(testCase: { fakeTimers?: boolean; now?: number }): void {
  pinCaseTimeZone()
  const now = testCase.now === undefined ? {} : { now: testCase.now }
  if (testCase.fakeTimers)
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
      ...now,
    })
  else if (testCase.now !== undefined) vi.useFakeTimers({ toFake: ['Date'], ...now })
}
