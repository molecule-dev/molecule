/**
 * Internationalization (i18n) interface for molecule.dev API.
 *
 * Mirrors `@molecule/app-i18n` for the server side: `t()` translations with
 * `{{variable}}` interpolation, locale bond registration, and number/date
 * formatting. Works with ZERO wiring — if no provider is bonded, a simple
 * in-memory provider ('en' default) is auto-created on first use, and `t()`
 * falls back to `defaultValue` (or the key itself), so untranslated strings
 * never crash a request.
 *
 * @example
 * ```typescript
 * import { registerLocaleModule, t } from '@molecule/api-i18n'
 * import * as locales from '@molecule/api-locales-user'
 *
 * // Startup: register a companion locale bond (all 79 locales in one call)
 * registerLocaleModule(locales)
 *
 * // Error responses — default locale
 * t('user.error.notFound', undefined, { defaultValue: 'User not found.' })
 *
 * // Per-user content (emails, notifications) — per-request locale OPTION
 * t('user.email.resetSubject', { appName }, { locale: user.locale, defaultValue: '{{appName}} password reset' })
 * ```
 *
 * @remarks
 * - **Never call `setLocale()` per request on the server.** The active locale is
 *   PROCESS-GLOBAL shared state — switching it for one user's email races every
 *   concurrent request. Pass the per-user locale in the third argument instead:
 *   `t(key, values, { locale })`. `setLocale()` is for single-locale deployments.
 * - Always pass `{ defaultValue }`: it's the rendered English fallback (and what
 *   shows if a key is missing — otherwise users see the raw dot-notation key).
 *   Keys are namespaced dot-paths (`'user.error.notFound'`), never English text.
 * - Translations live in companion locale bond packages, not inline in features:
 *   `registerLocaleModule(moduleExports)` registers every exported locale at once
 *   (export names like `zhTW` are normalized to `zh-TW`);
 *   `addTranslations(locale, map, namespace?)` deep-merges (later wins).
 * - **Pluralization requires a real bonded provider.** `{ count }` resolves
 *   CLDR plural-suffixed keys (`key_one` / `key_other` / …) in providers that
 *   implement it (e.g. `@molecule/api-i18n-simple`); the auto-created fallback
 *   provider IGNORES `count`.
 * - `formatNumber`/`formatDate` have NO per-call locale override — they format
 *   in the current global locale.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './plural.js'
export * from './provider.js'
export * from './translator.js'
export * from './types.js'
export * from './utilities.js'
