/**
 * Provider-agnostic equity-prices interface for molecule.dev.
 *
 * Defines the `EquityPricesProvider` interface for stock / ETF / fund
 * quotes, historical bars, fundamentals, and symbol search. Bond packages
 * (Alpha Vantage, IEX Cloud, Polygon.io, etc.) implement this interface.
 * Application code uses the convenience functions (`getQuote`,
 * `getHistorical`, `getFundamentals`, `searchSymbol`,
 * `listSupportedExchanges`) which delegate to the bonded provider.
 *
 * Quotes carry an explicit ISO 4217 currency so multi-exchange callers can
 * reconcile prices across markets. Symbols and exchange codes are kept as
 * plain strings so providers can support whatever catalogue they expose.
 *
 * @example
 * ```typescript
 * import { setProvider, getQuote, getHistorical } from '@molecule/api-equity-prices'
 * import { provider as alphaVantage } from '@molecule/api-equity-prices-alpha-vantage'
 *
 * setProvider(alphaVantage)
 * const quote = await getQuote('AAPL')
 * const bars = await getHistorical('AAPL', '1y')
 * ```
 *
 * @remarks
 * - **Server-side only.** Provider API keys are secrets; fetch quotes in API
 *   handlers/jobs and serve the UI through the app's own endpoints.
 * - **Cache aggressively.** Free market-data tiers are severely rate-limited
 *   (some to a few dozen calls per DAY) — a `getQuote()` per page render
 *   exhausts the quota. Cache quotes server-side and refresh on an interval,
 *   not per request.
 * - **Symbols and exchanges are provider catalogues, not universal.** Resolve
 *   user input through `searchSymbol()` instead of assuming a ticker exists,
 *   and store what the provider returned.
 * - **`EquityFundamentals` fields are optional by contract** — treat a missing
 *   field as "unknown", never as zero (an absent P/E is not a `0` P/E).
 * - Quotes carry an explicit ISO 4217 `currency` — format prices with it;
 *   never hardcode `$`.
 * - `getHistorical(symbol, range)` takes an enum range (`'1d'`…`'5y'`,
 *   `'max'`); bars return in ascending chronological order.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A known ticker (e.g. `getQuote('AAPL')`) renders a PLAUSIBLE quote in
 *   the UI — a real `price` in a sane range, formatted with the quote's own
 *   `currency` (never a hardcoded `$`), never `0` / `null` / `NaN` or a
 *   spinner that never resolves.
 * - [ ] Several distinct tickers (e.g. `AAPL` and `MSFT`) each render their
 *   OWN price — not one shared placeholder or the same number repeated (a
 *   stale-cache or wrong-symbol wiring bug).
 * - [ ] If the app charts history, `getHistorical(symbol, range)` returns an
 *   ascending series of `{ ts, close }` that actually draws a line that moves
 *   — not an empty array, a flat line, or points in reversed order.
 * - [ ] An invalid / unknown ticker resolves to a clear "not found" in the UI
 *   (empty `searchSymbol()` results, or a caught `getQuote` error) — never a
 *   crash, a blank card, or a `NaN` price.
 * - [ ] Staleness is honest: the quote's `ts` is surfaced (a timestamp or a
 *   "delayed / last close" label) so an out-of-hours last-close price is NOT
 *   presented as a live trade — the UI never dresses stale data up as real-time.
 * - [ ] A provider rate-limit / outage (free tiers cap at a few calls) degrades
 *   gracefully to last-known-cached data or an empty state with a message —
 *   never a crashed page or a `NaN`; quotes are cached server-side, not
 *   refetched per render.
 * - [ ] The provider API key stays server-side: quotes are served only through
 *   the app's own authenticated endpoint, scoped to specific symbols — not an
 *   open, unbounded proxy any caller can pass arbitrary tickers/params to.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
