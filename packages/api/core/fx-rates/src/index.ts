/**
 * Provider-agnostic foreign-exchange rates interface for molecule.dev.
 *
 * Defines the `FxRatesProvider` interface for currency conversion and daily
 * reference-rate lookups. Bond packages (ECB, OpenExchange, etc.) implement
 * this interface. Application code uses the convenience functions
 * (`getRate`, `getDailyRates`, `convert`, `listSupportedCurrencies`) which
 * delegate to the bonded provider.
 *
 * Rates are normalized as plain `number` ratios: `1 unit of FROM = rate units of TO`.
 * Currency codes are ISO 4217 three-letter strings (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 * Amounts are integer minor units (cents) to avoid floating-point drift.
 *
 * @example
 * ```typescript
 * import { convert, getRate, listSupportedCurrencies, setProvider } from '@molecule/api-fx-rates'
 * import { createProvider } from '@molecule/api-fx-rates-ecb'
 *
 * // Startup (server only): bond one provider. The ECB feed is keyless; snapshots are
 * // cached in memory for `cacheTtlMs` (default 1h).
 * setProvider(createProvider({ cacheTtlMs: 60 * 60 * 1000 }))
 *
 * // Validate user-supplied codes first — an unsupported code throws.
 * const supported = await listSupportedCurrencies() // ['EUR', 'GBP', 'JPY', 'USD', ...]
 *
 * // 1 EUR = `eurUsd` USD.
 * const eurUsd = await getRate('EUR', 'USD')
 *
 * // Amounts are integer MINOR units: €100.00 = 10_000 cents → USD cents.
 * const usdCents = await convert(10_000, 'EUR', 'USD')
 * const label = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
 *   usdCents / 100,
 * )
 * ```
 *
 * @remarks
 * - **Nothing works until a provider is bonded** — every function throws before
 *   `setProvider()`.
 * - **`convert()` does not rescale between currencies' minor units.** It returns
 *   `Math.round(amountMinor * rate)`; converting USD cents to JPY (0 decimals)
 *   yields a number 100x too large unless YOU divide by 100. Scale by each
 *   currency's decimals yourself.
 * - **Unknown/unsupported codes throw** — never fall back to a rate of 0 or 1.
 *   Check against `listSupportedCurrencies()` before calling.
 * - The ECB bond publishes once per business day (EUR-pivoted) and its
 *   historical `asOf` lookups only cover the last 90 days — an older `asOf`
 *   throws.
 * - Server-only: never call these from the browser or expose a provider key.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual currency/pricing screens, and check every box
 * off one by one. This is money: a wrong rate silently corrupts every price, so
 * verify the NUMBERS the app computes, not just that a value rendered. A box
 * you can't check is an integration bug to fix — not a skip:
 * - [ ] A known pair returns a PLAUSIBLE rate: `getRate('USD', 'EUR')` yields a
 *   real ratio (roughly 0.8-1.0 for USD->EUR), never 0, null, NaN, negative, or
 *   an absurd value like 1e9 — and the UI shows it as an actual number.
 * - [ ] `convert` does the CORRECT MATH: converting 100 USD (amountMinor
 *   `10_000` cents) USD->EUR returns approximately `10_000 * rate` in the
 *   target's minor units, rounded sensibly for that currency (integer cents;
 *   JPY has 0 decimals), and the UI shows that converted amount — not the
 *   untouched original.
 * - [ ] Round-trip consistency: the inverse pair is reciprocal —
 *   `getRate('EUR', 'USD')` is approximately `1 / getRate('USD', 'EUR')` — and
 *   same-currency is identity: `getRate('USD', 'USD')` is exactly `1` and
 *   `convert(x, 'USD', 'USD')` returns `x` unchanged.
 * - [ ] Changing the selected pair changes the displayed result (USD->EUR vs
 *   USD->JPY give visibly different converted amounts) — the screen is not
 *   pinned to one hardcoded rate.
 * - [ ] An unknown/unsupported code (e.g. `'ZZZ'`, absent from
 *   `listSupportedCurrencies()`) surfaces a clear error in the UI — NEVER a
 *   silent rate of 0 (which zeroes the price) or a pass-through of 1.
 * - [ ] If a historical lookup is exposed (`options.asOf`), a past date returns
 *   that day's rate (different from latest for a volatile pair), not today's.
 * - [ ] A provider/network failure surfaces gracefully (a visible error or
 *   retry) and the amount is left unconverted — the app NEVER falls back to
 *   converting at rate 0 or 1, which would corrupt the price shown or charged.
 * - [ ] The provider API key stays server-side — fx-rates is server-only; the
 *   key never appears in the browser bundle, the network tab, or any client
 *   response.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
