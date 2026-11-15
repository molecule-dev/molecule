/**
 * Solid financial ticker row.
 *
 * Exports `TickerRow` — symbol + price + change% + optional icon, sparkline
 * and meta, with the direction color applied inline via the ClassMap bond's
 * fixed hex values. Use for crypto trackers, stock watchlists, market
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
 * - `changePct` drives direction (▲/▼/–) and a FIXED green/red hex color
 *   applied inline — it does not follow theme success/error tokens. Pass
 *   `changeDisplay` to control the change text; the default is `changePct` to
 *   2 decimals with a percent sign.
 * - With `onClick` the row becomes a clickable div WITHOUT button semantics —
 *   wrap it in your own button/link (or add key handling) where keyboard
 *   access matters.
 *
 * @module
 */

export * from './TickerRow.jsx'
export * from './types.js'
