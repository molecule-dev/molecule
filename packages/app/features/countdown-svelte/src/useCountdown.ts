/**
 * Svelte hook porting React's `useCountdown`: a live-updating snapshot of the
 * time remaining until a target date.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, get, type Readable, readable, writable } from 'svelte/store'

import { computeState, targetMs, tickCountdown } from './state.js'
import type { CountdownState } from './types.js'

/**
 * Whether a hook argument is a Svelte readable store.
 *
 * @param value - A hook argument: a plain value or a store.
 * @returns True for a readable store.
 */
const isReadable = (value: unknown): value is Readable<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { subscribe?: unknown }).subscribe === 'function'

/**
 * The readable-store view of a hook argument: the store itself when it is one,
 * a constant store of the plain value otherwise.
 *
 * @param value - A plain value or a store of one.
 * @returns A readable store of the value.
 */
const toReadable = <T>(value: T | Readable<T>): Readable<T> =>
  isReadable(value) ? (value as Readable<T>) : readable(value as T)

/**
 * The interval a tick argument stands for: an omitted argument takes React's
 * default of one second, and any value at or below zero disables the timer.
 *
 * @param tickMs - The tick argument's current value.
 * @returns The refresh interval in milliseconds.
 */
const tickOf = (tickMs: number | undefined): number => (tickMs === undefined ? 1_000 : tickMs)

/**
 * Live-updating countdown to a target date, React's `useCountdown` in Svelte's
 * idiom: called during component init under a component tree, with a readable
 * store per live value. The target and interval may each be a plain value or a
 * readable store; the hook follows a changed store for the component's life,
 * the way React's hook follows a re-render with new arguments.
 *
 * @param target - Date / ISO string / epoch ms, or a store of one.
 * @param tickMs - Refresh interval, or a store of one. Defaults to `1000`; `0` or less disables it.
 * @returns A readable store per live countdown field.
 * @example
 * ```svelte
 * <script>
 *   import { useCountdown } from '@molecule/app-countdown-svelte'
 *   const countdown = useCountdown('2026-12-31T23:59:59Z')
 * </script>
 *
 * <p>{$countdown.days}d {$countdown.hours}h</p>
 * ```
 */
export function useCountdown(
  target: Date | string | number | Readable<Date | string | number>,
  tickMs: number | undefined | Readable<number | undefined> = 1_000,
): {
  /** Days remaining. */
  days: Readable<number>
  /** Hours (0-23) within current day. */
  hours: Readable<number>
  /** Minutes (0-59) within current hour. */
  minutes: Readable<number>
  /** Seconds (0-59) within current minute. */
  seconds: Readable<number>
  /** Total milliseconds remaining (negative if past). */
  msRemaining: Readable<number>
  /** True once the target is in the past. */
  expired: Readable<boolean>
} {
  const targetStore = toReadable(target)
  const tickStore = toReadable(tickMs)
  const state = writable<CountdownState>(computeState(targetMs(get(targetStore)), Date.now()))
  let stop: (() => void) | null = null
  /** Re-reads both arguments and restarts the timer from the new ones. */
  const refresh = (): void => {
    stop?.()
    stop = tickCountdown(targetMs(get(targetStore)), tickOf(get(tickStore)), (next) =>
      state.set(next),
    )
  }
  // A store's subscribe calls back at once, so this is also the mount read.
  const stopTarget = targetStore.subscribe(refresh)
  const stopTick = tickStore.subscribe(refresh)
  onDestroy(() => {
    stop?.()
    stopTarget()
    stopTick()
  })
  return {
    days: derived(state, (current) => current.days),
    hours: derived(state, (current) => current.hours),
    minutes: derived(state, (current) => current.minutes),
    seconds: derived(state, (current) => current.seconds),
    msRemaining: derived(state, (current) => current.msRemaining),
    expired: derived(state, (current) => current.expired),
  }
}
