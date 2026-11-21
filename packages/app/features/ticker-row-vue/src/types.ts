/**
 * Types for the Vue financial ticker row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link TickerRow} component. */
export interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"). A prop or the same-named slot — both work. */
  symbol: VNodeChild
  /** Full name display ("Bitcoin", "Apple Inc."). A prop or the same-named slot — both work. */
  name?: VNodeChild
  /** Optional leading icon / logo. A prop or the same-named slot — both work. */
  icon?: VNodeChild
  /** Current price (formatted string). A prop or the same-named slot — both work. */
  price: VNodeChild
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). A prop or the same-named slot — both work. */
  changeDisplay?: VNodeChild
  /** Optional sparkline node (pass `<Sparkline values={...} />` from `app-sparkline-vue`). A prop or the same-named slot — both work. */
  sparkline?: VNodeChild
  /** Optional volume / market-cap display. May hold a control; it keeps its own clicks. A prop or the same-named slot — both work. */
  meta?: VNodeChild
  /**
   * Click handler. While it is set the whole row is clickable through a
   * transparent native button laid over it, named by the symbol; the inner
   * controls (the `meta` slot) sit above that button and keep their own
   * clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
