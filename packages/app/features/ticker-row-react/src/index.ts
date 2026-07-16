/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 *
 * Exports `<TickerRow>`. Use for crypto trackers, stock watchlists,
 * market dashboards. Pair the `sparkline` slot with
 * `<Sparkline values={...} />` from `@molecule/app-sparkline-react`.
 *
 * @example
 * ```tsx
 * import { TickerRow } from '@molecule/app-ticker-row-react'
 *
 * declare function openAsset(id: string): void
 *
 * <TickerRow
 *   symbol="BTC"
 *   name="Bitcoin"
 *   price="$67,420"
 *   changePct={2.34}
 *   meta="$1.3T"
 *   onClick={() => openAsset('btc')}
 * />
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). `price`/`meta` are opaque display nodes — the app owns
 *   number/currency formatting.
 * - `changePct` drives direction (▲/▼/–) and a FIXED green/red hex
 *   color applied inline — it does not follow theme success/error
 *   tokens. Pass `changeDisplay` to control the change text; the
 *   default is `changePct` to 2 decimals with a percent sign.
 * - With `onClick` the row becomes a clickable div WITHOUT button
 *   semantics — wrap it in your own button/link (or add key handling)
 *   where keyboard access matters.
 *
 * @module
 */

export * from './TickerRow.js'
