/**
 * Common utilities for molecule.dev frontend applications.
 *
 * Framework-agnostic helpers for async control (debounce/throttle/retry/sleep),
 * strings, dates, Intl-based formatting (currency/number/percent/file size),
 * validation, clipboard, URLs/query strings, URL-safe base64, and user-friendly
 * error messages. Prefer these over hand-rolling the same helpers in app code —
 * they are dependency-free and already tested.
 *
 * @example
 * ```typescript
 * import { getLocale, t } from '@molecule/app-i18n'
 * import { debounce, formatCurrency, getErrorMessage, retry, toQueryString } from '@molecule/app-utilities'
 *
 * interface Product {
 *   name: string
 *   price: number
 * }
 *
 * const render = (lines: string[]): void => console.log(lines)
 *
 * const loadProducts = async (query: string): Promise<Product[]> => {
 *   const response = await fetch(`/api/products${toQueryString({ q: query, limit: 5 })}`) // '?q=fern&limit=5'
 *   if (!response.ok) throw new Error(`Search failed (${response.status})`)
 *   return (await response.json()) as Product[]
 * }
 *
 * // debounce/throttle callbacks must type their params `unknown` (the generic is `(...args: unknown[])`).
 * const onSearchInput = debounce((value: unknown) => {
 *   retry(() => loadProducts(String(value)), { maxAttempts: 3, initialDelay: 500 }) // delays in ms
 *     .then((products) =>
 *       render(products.map((p) => `${p.name} ${formatCurrency(p.price, 'EUR', getLocale())}`)),
 *     ) // ['Fern €12.50'] with the 'en' locale
 *     .catch((error: unknown) => render([getErrorMessage(error, undefined, t)])) // pass `t` to localize
 * }, 300)
 *
 * onSearchInput('f')
 * onSearchInput('fern') // only 'fern' is fetched — 300 ms after the last call
 * ```
 *
 * @remarks
 * - **`randomString()` and the `uuid()` fallback use `Math.random()` — NOT
 *   cryptographically secure.** Never use them for tokens, secrets, or anything
 *   security-sensitive. `uuid()` is fine for element keys/optimistic ids (it
 *   prefers `crypto.randomUUID()` when available).
 * - **English output is a fallback, not i18n.** `getErrorMessage()` localizes only
 *   when you pass the app's `t` — always pass it for UI surfaces. `timeAgo()`
 *   returns English-only strings ("3 hours ago"); use it for logs/dev tooling and
 *   format user-facing relative times through the app's i18n layer instead.
 * - **Browser-only helpers** (`copyToClipboard`, `readFromClipboard`, `openUrl`,
 *   `handleAnchorClick`, `isInternalUrl`) touch `window`/`document`/`navigator` —
 *   guard them in SSR/native contexts. `copyToClipboard` resolves `false` on
 *   failure rather than throwing; check the result before showing a "Copied" state.
 * - `debounce`/`throttle` return void-returning wrappers — do not await them, and type the
 *   wrapped callback's params as `unknown` (a `(q: string) => …` callback is a type error).
 *   For async retries use `retry(fn, { maxAttempts, initialDelay })` (exponential backoff,
 *   all delays in MILLISECONDS); it re-throws the LAST error, and non-`Error` rejections are
 *   wrapped as `new Error(String(value))` — throw real `Error`s or the message becomes
 *   `'[object Object]'`.
 * - `formatCurrency`/`formatNumber`/`formatPercent` default to `'en-US'`, NOT the app's
 *   locale — pass `getLocale()` from `@molecule/app-i18n`. `formatPercent(0.75)` expects a
 *   FRACTION (→ `'75%'`), not `75`.
 *
 * @module
 */

export * from './async.js'
export * from './clipboard.js'
export * from './date.js'
export * from './encoding.js'
export * from './error.js'
export * from './format.js'
export * from './random.js'
export * from './string.js'
export * from './types.js'
export * from './url.js'
export * from './validation.js'
