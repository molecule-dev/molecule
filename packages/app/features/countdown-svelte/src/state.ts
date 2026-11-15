/**
 * The countdown arithmetic shared by the composable and the component: the
 * target's epoch milliseconds, the remaining-time snapshot, and the three
 * display formats React's component renders.
 *
 * Framework-neutral on purpose — every countdown package's own internals are
 * private, and this module is not exported from the package's entry.
 *
 * @module
 */

import type { CountdownState } from './types.js'

/** The display format {@link formatDisplay} renders. */
export type CountdownFormat = 'compact' | 'long' | 'colon'

/**
 * The epoch milliseconds a target stands for.
 *
 * @param target - Date / ISO string / epoch ms.
 * @returns Epoch milliseconds (`NaN` for an unparseable string, as `+new Date`).
 */
export const targetMs = (target: Date | string | number): number =>
  typeof target === 'number' ? target : target instanceof Date ? +target : +new Date(target)

/**
 * Decomposes the time between `now` and a target into days / hours / minutes /
 * seconds, clamping the units to 0 once the target is in the past.
 *
 * @param ts - The target, in epoch milliseconds.
 * @param now - The current instant, in epoch milliseconds.
 * @returns The countdown snapshot.
 */
export function computeState(ts: number, now: number): CountdownState {
  const ms = ts - now
  const expired = ms <= 0
  const t = Math.max(0, ms)
  return {
    days: Math.floor(t / 86_400_000),
    hours: Math.floor((t % 86_400_000) / 3_600_000),
    minutes: Math.floor((t % 3_600_000) / 60_000),
    seconds: Math.floor((t % 60_000) / 1_000),
    msRemaining: ms,
    expired,
  }
}

/**
 * Zero-pads one countdown unit to two digits.
 *
 * @param n - The unit.
 * @returns Its two-digit text.
 */
const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * Renders the display text for one format, exactly as React's component does:
 * compact skips zero leading units, long spells the units out with
 * pluralisation, and colon zero-pads every unit.
 *
 * @param format - The display format.
 * @param days - Days remaining.
 * @param hours - Hours within the day.
 * @param minutes - Minutes within the hour.
 * @param seconds - Seconds within the minute.
 * @returns The display text.
 */
export function formatDisplay(
  format: CountdownFormat | string,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
): string {
  if (format === 'colon') return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (format === 'long') {
    const parts: string[] = []
    if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
    if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
    if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
    parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
    return parts.join(' ')
  }
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours || days) parts.push(`${hours}h`)
  if (minutes || hours || days) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

/**
 * Applies the countdown to a target and keeps it current: publishes the
 * snapshot at once and again on every tick, so the caller only has to hand the
 * result to its framework's reactive container.
 *
 * @param ts - The target, in epoch milliseconds.
 * @param tickMs - Refresh interval; `0` or less publishes once and starts no timer.
 * @param publish - Receives each snapshot.
 * @returns A function that stops the timer.
 */
export function tickCountdown(
  ts: number,
  tickMs: number,
  publish: (state: CountdownState) => void,
): () => void {
  publish(computeState(ts, Date.now()))
  if (tickMs <= 0) return () => undefined
  const id = setInterval(() => publish(computeState(ts, Date.now())), tickMs)
  return () => clearInterval(id)
}
