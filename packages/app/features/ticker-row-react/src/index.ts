/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 *
 * Exports `<TickerRow>`. Use for crypto trackers, stock watchlists,
 * market dashboards. Pair the `sparkline` slot with
 * `<Sparkline values={...} />` from `@molecule/app-sparkline-react`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { TickerRow } from '@molecule/app-ticker-row-react'
 *
 * export function Watchlist() {
 *   const quotes = [
 *     { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 67420.5, changePct: 2.34, marketCap: 1.33e12 },
 *     { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 3512.1, changePct: -1.08, marketCap: 4.2e11 },
 *   ]
 *   const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
 *   const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })
 *   const [selectedId, setSelectedId] = useState<string | null>(null)
 *   return (
 *     <section>
 *       {quotes.map((q) => (
 *         <TickerRow
 *           key={q.id}
 *           symbol={q.symbol}
 *           name={q.name}
 *           price={usd.format(q.price)}
 *           changePct={q.changePct}
 *           meta={compact.format(q.marketCap)}
 *           onClick={() => setSelectedId(q.id)}
 *         />
 *       ))}
 *       {selectedId && <p>Selected: {selectedId}</p>}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `changePct` is a PERCENT number (`2.34` = +2.34%), not a fraction
 *   (`0.0234`) and not a string. `price` is shown verbatim — format it
 *   yourself (e.g. `Intl.NumberFormat`); passing a raw number shows no
 *   currency symbol or grouping.
 * - It does NOT fetch or stream quotes — re-render with new props.
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
