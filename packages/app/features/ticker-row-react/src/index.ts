/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 *
 * Exports `<TickerRow>`.
 *
 * @example
 * ```tsx
 * import { TickerRow } from '@molecule/app-ticker-row-react'
 *
 * <TickerRow
 *   symbol="BTC"
 *   name="Bitcoin"
 *   price="$67,420"
 *   changePct={2.34}
 *   meta="$1.3T"
 *   onClick={() => router.push('/asset/btc')}
 * />
 * ```
 *
 * @module
 */

export * from './TickerRow.js'
