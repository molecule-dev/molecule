/**
 * Types of `@molecule/app-ticker-row-angular` — the Angular counterpart of
 * `@molecule/app-ticker-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link TickerRow} — the same props
 * `@molecule/app-ticker-row-react` accepts. Node props are projected content in
 * Angular (an input cannot carry a node): `symbol`, `name`, `icon`, `price`,
 * `sparkline` and `meta` are the element's `[slot=<name>]` content, with a
 * string/number input rendering as text instead. `changeDisplay` is text-only
 * (React's condition and fallback are both input-value shaped, so there is no
 * slot for it).
 */
export interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"): text, or `[slot=symbol]` content. */
  symbol?: unknown
  /** Full name display ("Bitcoin", "Apple Inc."): text, or `[slot=name]` content. */
  name?: unknown
  /** Optional leading icon / logo: text, or `[slot=icon]` content. */
  icon?: unknown
  /** Current price (formatted): text, or `[slot=price]` content. */
  price?: unknown
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). Text. */
  changeDisplay?: string
  /** Optional sparkline node: text, or `[slot=sparkline]` content. */
  sparkline?: unknown
  /** Optional volume / market-cap display: text, or `[slot=meta]` content. */
  meta?: unknown
  /**
   * Click handler (React's `onClick`). Passed as `[onClick]`; the host's
   * native click calls it, and a passed handler also applies the
   * `cm.cursorPointer` class, exactly as React's truthy `onClick` does.
   */
  onClick?: (event: MouseEvent) => void
  /** Extra classes. */
  className?: string
}
