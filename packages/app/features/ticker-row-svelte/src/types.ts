/**
 * Types for the Svelte financial ticker row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link TickerRow} component. */
export interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"). A snippet renders inline. */
  symbol: Snippet | string | number
  /** Full name display ("Bitcoin", "Apple Inc."). A snippet renders inline. */
  name?: Snippet | string | number
  /** Optional leading icon / logo. A snippet renders inline. */
  icon?: Snippet | string | number
  /** Current price (formatted string). A snippet renders inline. */
  price: Snippet | string | number
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). A snippet renders inline. */
  changeDisplay?: Snippet | string | number
  /** Optional sparkline node (pass `<Sparkline values={...} />` from `app-sparkline-svelte`). A snippet renders inline. */
  sparkline?: Snippet | string | number
  /** Optional volume / market-cap display. May hold a control; it keeps its own clicks. A snippet renders inline. */
  meta?: Snippet | string | number
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
