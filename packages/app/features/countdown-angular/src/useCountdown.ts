/**
 * Angular function porting React's `useCountdown`: a live-updating snapshot of
 * the time remaining until a target date.
 *
 * @module
 */

import { computed, effect, isSignal, type Signal, signal } from '@angular/core'

import { computeState, targetMs, tickCountdown } from './state.js'
import type { CountdownState } from './types.js'

/**
 * The interval a tick argument stands for: an omitted argument takes React's
 * default of one second, and any value at or below zero disables the timer.
 *
 * @param tickMs - The tick argument's current value.
 * @returns The refresh interval in milliseconds.
 */
const tickOf = (tickMs: number | undefined): number => (tickMs === undefined ? 1_000 : tickMs)

/**
 * Reads a hook argument's current value: a signal read inside an `effect`
 * tracks it, so the countdown follows a changed argument.
 *
 * @param value - The plain value or the signal holding it.
 * @returns The argument's current value.
 */
const read = <T>(value: T | Signal<T>): T => (isSignal(value) ? value() : value)

/**
 * Live-updating countdown to a target date, React's `useCountdown` in Angular's
 * idiom: call it in an injection context (a component field initializer or
 * constructor). The target and interval may each be a plain value or a signal,
 * and the countdown follows a changed signal on the same host — a component
 * re-rendering with a new `target` input behaves as React's hook does.
 *
 * @param target - Date / ISO string / epoch ms, or a signal of one.
 * @param tickMs - Refresh interval, or a signal of one. Defaults to `1000`; `0` or less disables it.
 * @returns A signal per live countdown field.
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-sale',
 *   template: `
 *     @if (countdown.expired()) { <p>Sale ended!</p> }
 *     @else { <p>{{ countdown.days() }}d {{ countdown.hours() }}h</p> }
 *   `,
 * })
 * export class Sale {
 *   readonly countdown = useCountdown('2026-12-31T23:59:59Z')
 * }
 * ```
 */
export function useCountdown(
  target: Date | string | number | Signal<Date | string | number>,
  tickMs: number | undefined | Signal<number | undefined> = 1_000,
): {
  /** Days remaining. */
  days: Signal<number>
  /** Hours (0-23) within current day. */
  hours: Signal<number>
  /** Minutes (0-59) within current hour. */
  minutes: Signal<number>
  /** Seconds (0-59) within current minute. */
  seconds: Signal<number>
  /** Total milliseconds remaining (negative if past). */
  msRemaining: Signal<number>
  /** True once the target is in the past. */
  expired: Signal<boolean>
} {
  const state = signal<CountdownState>(computeState(targetMs(read(target)), Date.now()))
  effect((onCleanup) => {
    const stop = tickCountdown(targetMs(read(target)), tickOf(read(tickMs)), (next) =>
      state.set(next),
    )
    onCleanup(stop)
  })
  return {
    days: computed(() => state().days),
    hours: computed(() => state().hours),
    minutes: computed(() => state().minutes),
    seconds: computed(() => state().seconds),
    msRemaining: computed(() => state().msRemaining),
    expired: computed(() => state().expired),
  }
}
