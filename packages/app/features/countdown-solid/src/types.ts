/**
 * Types for the Solid countdown, the same props `@molecule/app-countdown-react`
 * accepts.
 *
 * @module
 */

import type { JSX } from 'solid-js'

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
 * Node-valued props are Solid JSX values; as everywhere in Solid they may also
 * arrive as an accessor of one.
 */
export interface CountdownProps {
  /** Target date / ISO string / epoch ms. */
  target: Date | string | number
  /** Display format. Defaults to `'compact'`. */
  format?: 'compact' | 'long' | 'colon'
  /** Renderer override — receives the live state for full control. */
  render?: (state: CountdownState) => JSX.Element
  /** Optional rendered when the timer expires. */
  expired?: JSX.Element | (() => JSX.Element)
  /** Extra classes. */
  className?: string
}
