/**
 * Provider-agnostic crypto-prices interface for molecule.dev.
 *
 * Defines the {@link CryptoPricesProvider} interface for cryptocurrency
 * price lookups. Bond packages (CoinGecko, CoinMarketCap, Binance, etc.)
 * implement this interface. Application code uses the convenience
 * functions (`listCoins`, `getPrice`, `getHistorical`,
 * `listSupportedSymbols`, `getMarketStats`) which delegate to the bonded
 * provider.
 *
 * Quote currencies (`'usd'`, `'eur'`, `'btc'`, ...) are conventionally
 * lower-case to match common upstream APIs.
 *
 * @example
 * ```typescript
 * import { setProvider, getPrice, listCoins } from '@molecule/api-crypto-prices'
 * import { provider as coingecko } from '@molecule/api-crypto-prices-coingecko'
 *
 * setProvider(coingecko)
 * const top = await listCoins({ limit: 50 })
 * const btc = await getPrice('bitcoin', 'usd')
 * ```
 *
 * @remarks
 * - **Server-side only.** Price lookups run in API handlers/jobs — provider
 *   API keys are secrets and never reach the browser. Expose an app endpoint
 *   that returns exactly the data the UI needs.
 * - **`CoinId` is provider-specific — never hardcode one provider's ids.**
 *   `'bitcoin'` is a CoinGecko id; other providers key coins differently.
 *   Resolve ids at runtime (`listCoins()` / `listSupportedSymbols()`) or store
 *   the id the bonded provider returned, so swapping bonds doesn't silently
 *   break lookups.
 * - **Cache aggressively.** Free upstream tiers are heavily rate-limited — a
 *   `getPrice()` per page render gets the app throttled. Cache quotes
 *   server-side (seconds–minutes of staleness is fine for display) and prefer
 *   one `listCoins()` over N `getPrice()` calls.
 * - `getHistorical(id, days)` takes a positive integer count of days back from
 *   now (`7`, `30`, `365`) — not a date or a range string.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A known coin's spot price renders in the UI: `getPrice(id, 'usd')` (id
 *   from `listCoins()`/`listSupportedSymbols()`, never a hardcoded provider id)
 *   returns a `CoinPriceQuote` with a PLAUSIBLE `price` (BTC is thousands of
 *   USD, not 0/null/NaN) and it shows on screen, not "—".
 * - [ ] The market list shows DISTINCT prices: `listCoins()` renders multiple
 *   `CoinMarketRow`s and each coin's `price` is its own value (BTC ≠ ETH, not a
 *   repeated copy), with `symbol`/`name` matching the row.
 * - [ ] If a chart/detail screen is exposed, `getHistorical(id, days)` returns a
 *   series of `CoinPricePoint` `(ts, price)` samples in chronological order that
 *   render as a line/spark chart — not a single point or an empty box.
 * - [ ] Switching the quote currency (USD→EUR) re-fetches with the new
 *   `vsCurrency` and the displayed values CHANGE, shown with the right symbol
 *   and precision ($/€, not a raw float).
 * - [ ] Prices refresh: a later `getPrice`/`listCoins` can return a different
 *   `price`/`change24h` and the UI updates (or shows an "as of" time from
 *   `asOf`) — it isn't frozen at first paint.
 * - [ ] Edge/error: an unknown coin id or symbol surfaces a clear "not found" in
 *   the UI, and a provider/rate-limit failure degrades gracefully (stale-but-
 *   shown or an empty state) — never a crash, blank, or NaN.
 * - [ ] The provider API key (if the bonded provider needs one) stays
 *   server-side: the browser calls the app's own endpoint, never the upstream
 *   API directly, and that endpoint isn't an open proxy for arbitrary
 *   coin/currency params.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
