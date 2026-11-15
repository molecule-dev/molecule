/**
 * Vue financial ticker row — symbol + price + change% + optional sparkline.
 *
 * Exports `<TickerRow>`. Use for crypto trackers, stock watchlists, market
 * dashboards. It is the Vue counterpart of `@molecule/app-ticker-row-react`:
 * the same props (React names) and the same DOM for the same input. Pair the
 * `sparkline` slot with `<Sparkline values={...} />` from
 * `@molecule/app-sparkline-vue`.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { TickerRow } from '@molecule/app-ticker-row-vue'
 *
 * declare function openAsset(id: string): void
 *
 * const Watchlist = defineComponent({
 *   setup() {
 *     return () => [
 *       h(TickerRow, {
 *         symbol: 'BTC',
 *         name: 'Bitcoin',
 *         price: '$67,420',
 *         changePct: 2.34,
 *         meta: '$1.3T',
 *         onClick: () => openAsset('btc'),
 *       }),
 *     ]
 *   },
 * })
 *
 * createApp(Watchlist).mount('#app')
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
 * - Node-valued props (`icon`, `sparkline`, `meta`, …) arrive as a prop AND a
 *   same-named slot; components accept either.
 *
 * @module
 */

export * from './TickerRow.js'
export * from './types.js'
