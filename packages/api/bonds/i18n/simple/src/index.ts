/**
 * Simple i18n provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-i18n'
 * import { provider } from '@molecule/api-i18n-simple'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * This bond implements the same `I18nProvider` fleet contract as
 * `@molecule/app-i18n`'s core simple provider and the `@molecule/app-i18n-i18next`
 * bond — cross-checked so swapping providers never silently changes behavior:
 *
 * - `setLocale(locale)` THROWS `Error('Locale "<code>" not found')` for an
 *   unregistered locale — it never silently degrades.
 * - `t(key, values, { count })`: when `count` is given, the plural-suffixed
 *   key (`` `${key}_${pluralForm}` ``, falling back to `` `${key}_other` ``)
 *   is tried BEFORE the base `key` — matching i18next's own resolution order.
 *   A catalog with both `item` and `item_one`/`item_other` pluralizes.
 * - `addTranslations()` DEEP-merges nested translation objects; two calls
 *   sharing a top-level namespace key merge their subtrees instead of one
 *   clobbering the other.
 * - `exists(key)` follows the same locale-fallback chain as `t()` (active
 *   locale, then English) — it agrees with whether `t(key)` would render
 *   real text, not just whether the active locale's own catalog has it.
 *
 * @module
 */

export * from './provider.js'
