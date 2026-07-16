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
 * import { debounce, formatCurrency, getErrorMessage } from '@molecule/app-utilities'
 * import { t } from '@molecule/app-i18n'
 *
 * const onSearch = debounce((q: unknown) => runSearch(q as string), 300)
 * const price = formatCurrency(1234.56, 'EUR', 'de-DE')
 *
 * try {
 *   await saveThing()
 * } catch (error) {
 *   // Pass the app's `t` so the message is localized — defaults are English-only.
 *   showToast(getErrorMessage(error, undefined, t))
 * }
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
 * - `debounce`/`throttle` return void-returning wrappers — do not await them. For
 *   async retries use `retry(fn, { maxAttempts, initialDelay })` (exponential backoff).
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
