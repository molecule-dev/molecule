/**
 * Types of `@molecule/app-countdown-angular` — the Angular counterpart of
 * `@molecule/app-countdown-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

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
 * Node-valued props are templates in Angular (an input cannot carry a node):
 * `expired` and `render` are `<ng-template>` refs, `render`'s receiving the
 * live state as `$implicit` / `a0`.
 */
export interface CountdownProps {
  /** Target date / ISO string / epoch ms. */
  target: Date | string | number
  /** Display format. Defaults to `'compact'`. */
  format?: 'compact' | 'long' | 'colon'
  /** Renderer override — receives the live state as its template context. */
  render?: TemplateRef<unknown> | null
  /** Optional template rendered when the timer expires. */
  expired?: TemplateRef<unknown> | null
  /** Extra classes. */
  className?: string
}
