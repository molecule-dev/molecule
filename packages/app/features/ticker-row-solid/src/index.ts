/**
 * Solid financial ticker row.
 *
 * Exports `TickerRow` — symbol + price + change% + optional icon, sparkline
 * and meta, with the direction colored by the ClassMap bond's success/error
 * text tokens. Use for crypto trackers, stock watchlists, market
 * dashboards. It is the Solid counterpart of `@molecule/app-ticker-row-react`:
 * the same props (React names) and the same DOM for the same input. Pair the
 * `sparkline` prop with `<Sparkline values={...} />` from
 * `@molecule/app-sparkline-solid`.
 *
 * @example
 * ```tsx
 * import { TickerRow } from '@molecule/app-ticker-row-solid'
 *
 * declare function openAsset(id: string): void
 *
 * export function Watchlist() {
 *   return (
 *     <TickerRow
 *       symbol="BTC"
 *       name="Bitcoin"
 *       price="$67,420"
 *       changePct={2.34}
 *       meta="$1.3T"
 *       onClick={() => openAsset('btc')}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before bonding).
 *   `price`/`meta` are opaque display nodes — the app owns number/currency
 *   formatting.
 * - `changePct` drives direction (▲/▼/–) and the theme's success/error
 *   text tokens (`cm.textSuccess` / `cm.textError`). Pass `changeDisplay`
 *   to control the change text; the default formats `changePct` as a
 *   percent in the app's active locale.
 * - With `onClick` the whole row is clickable through a transparent native
 *   button laid over it, named by the symbol; the inner controls (the `meta`
 *   slot) sit above that button and keep their own clicks. A native button
 *   turns Enter and Space into the same click itself.
 *
 * @module
 */

export * from './TickerRow.jsx'
export * from './types.js'
