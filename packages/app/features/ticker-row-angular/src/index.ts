/**
 * Angular financial ticker row — symbol + price + change% + optional
 * sparkline.
 *
 * Exports `<TickerRow>` (use the `mol-ticker-row` attribute on a `div`). Use
 * for crypto trackers, stock watchlists, market dashboards. It is the Angular
 * counterpart of `@molecule/app-ticker-row-react`: the same props (React
 * names) and the same DOM for the same input. Pair the `sparkline` projection
 * with the sparkline component from `@molecule/app-sparkline-angular`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TickerRow } from '@molecule/app-ticker-row-angular'
 *
 * @Component({
 *   selector: 'app-watchlist',
 *   standalone: true,
 *   imports: [TickerRow],
 *   template: `
 *     <div mol-ticker-row symbol="BTC" name="Bitcoin" price="$67,420" [changePct]="2.34" meta="$1.3T" [onClick]="() => openAsset('btc')"></div>
 *   `,
 * })
 * export class Watchlist {}
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
 * - Node-valued props (`symbol`, `name`, `icon`, `price`, `sparkline`, `meta`)
 *   are projected content: `[slot=<name>]`, with a string or number input
 *   rendering as text instead. `changeDisplay` is text-only.
 *
 * @module
 */

export * from './ticker-row.component.js'
export * from './types.js'
