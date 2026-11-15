/**
 * Types for the Svelte countdown, the same props `@molecule/app-countdown-react`
 * accepts.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Snapshot of time remaining until a target date. */
export interface CountdownState {
  /** Days remaining. */
  days: number
  /** Hours (0-23) within current day. */
  hours: number
  /** Minutes (0-59) within current hour. */
  minutes: number
  /** Seconds (0-59) within current minute. */
  seconds: number
  /** Total milliseconds remaining (negative if past). */
  msRemaining: number
  /** True once `target` is in the past. */
  expired: boolean
}

/**
 * Props accepted by the {@link Countdown} component — React's prop names.
 *
 * React's node-valued and render props are Svelte snippets here: `render`
 * receives the live state, and `expired` renders once the target has passed.
 */
export interface CountdownProps {
  /** Target date / ISO string / epoch ms. */
  target: Date | string | number
  /** Display format. Defaults to `'compact'`. */
  format?: 'compact' | 'long' | 'colon'
  /** Renderer override — receives the live state for full control. */
  render?: Snippet<[CountdownState]>
  /** Optional rendered when the timer expires. */
  expired?: Snippet
  /** Extra classes. */
  className?: string
}
