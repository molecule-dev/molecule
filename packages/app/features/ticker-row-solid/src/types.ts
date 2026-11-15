/**
 * Types for the Solid financial ticker row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link TickerRow} component. */
export interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"). */
  symbol: JSX.Element
  /** Full name display ("Bitcoin", "Apple Inc."). */
  name?: JSX.Element
  /** Optional leading icon / logo. */
  icon?: JSX.Element
  /** Current price (formatted string). */
  price: JSX.Element
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). */
  changeDisplay?: JSX.Element
  /** Optional sparkline node (pass `<Sparkline values={...} />` from `app-sparkline-solid`). */
  sparkline?: JSX.Element
  /** Optional volume / market-cap display. */
  meta?: JSX.Element
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
