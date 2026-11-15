/**
 * Solid primitive porting React's `useCountdown`: a live-updating snapshot of
 * the time remaining until a target date.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import { computeState, targetMs } from './state.js'

/**
 * The interval a tick argument stands for: an omitted argument takes React's
 * default of one second, and any value at or below zero disables the timer.
 *
 * @param tickMs - The tick argument's current value.
 * @returns The refresh interval in milliseconds.
 */
const tickOf = (tickMs: number | undefined): number => (tickMs === undefined ? 1_000 : tickMs)

/**
 * Live-updating countdown to a target date, React's `useCountdown` in Solid's
 * idiom: the target and interval may each be a plain value or an accessor, and
 * the primitive follows a changed source on the same mount — a component
 * re-rendering with a new `target` prop behaves as React's hook does.
 *
 * @param target - Date / ISO string / epoch ms.
 * @param tickMs - Refresh interval. Defaults to `1000`; `0` or less disables it.
 * @returns An accessor per live countdown field.
 * @example
 * ```tsx
 * import { useCountdown } from '@molecule/app-countdown-solid'
 *
 * function Sale() {
 *   const countdown = useCountdown('2026-12-31T23:59:59Z')
 *   return <p>{countdown.days()}d {countdown.hours()}h</p>
 * }
 * ```
 */
export function useCountdown(
  target: Date | string | number | Accessor<Date | string | number>,
  tickMs: number | undefined | Accessor<number | undefined> = 1_000,
): {
  /** Days remaining. */
  days: Accessor<number>
  /** Hours (0-23) within current day. */
  hours: Accessor<number>
  /** Minutes (0-59) within current hour. */
  minutes: Accessor<number>
  /** Seconds (0-59) within current minute. */
  seconds: Accessor<number>
  /** Total milliseconds remaining (negative if past). */
  msRemaining: Accessor<number>
  /** True once the target is in the past. */
  expired: Accessor<boolean>
} {
  const read = <T>(value: T | Accessor<T>): T =>
    typeof value === 'function' ? (value as Accessor<T>)() : (value as T)
  const ts = (): number => targetMs(read(target))
  const [state, setState] = createSignal(computeState(ts(), Date.now()))
  createEffect(() => {
    const current = ts()
    const tick = tickOf(read(tickMs))
    setState(computeState(current, Date.now()))
    if (tick <= 0) return
    const id = setInterval(() => setState(computeState(current, Date.now())), tick)
    onCleanup(() => clearInterval(id))
  })
  return {
    days: () => state().days,
    hours: () => state().hours,
    minutes: () => state().minutes,
    seconds: () => state().seconds,
    msRemaining: () => state().msRemaining,
    expired: () => state().expired,
  }
}
