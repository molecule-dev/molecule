/**
 * Types of `@molecule/app-trend-chip-angular` — the Angular counterpart of
 * `@molecule/app-trend-chip-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link TrendChip} — the same props
 * `@molecule/app-trend-chip-react` accepts. Node-valued `prefix` content is
 * projected in Angular (an input cannot carry a node), so it is typed
 * `unknown`: pass a string or number value through the input, and element
 * content in the host template as `[slot=prefix]` content.
 */
export interface TrendChipProps {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta: number
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. Defaults to '%'. */
  suffix?: string
  /**
   * Optional prefix for the value. A string or number feeds the default aria
   * label and renders as text; element content is projected as
   * `[slot=prefix]` content instead.
   */
  prefix?: unknown
  /** Style preset. `'subtle'` = inline plain, `'pill'` = colored pill. Defaults to `'subtle'`. */
  variant?: 'subtle' | 'pill'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
