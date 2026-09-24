/**
 * Simple i18n provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { addTranslations, formatNumber, setLocale, setProvider, t } from '@molecule/api-i18n'
 * import { createSimpleI18nProvider } from '@molecule/api-i18n-simple'
 *
 * // Startup: bond once, then register the app's own catalogs.
 * setProvider(createSimpleI18nProvider('en'))
 * addTranslations('en', {
 *   orders: {
 *     shipped: 'Hi {{name}}, your order shipped.',
 *     items_one: '{{count}} item',
 *     items_other: '{{count}} items',
 *   },
 * })
 * addTranslations('fr', {
 *   orders: { shipped: 'Bonjour {{name}}, votre commande est partie.' },
 * })
 *
 * t('orders.shipped', { name: 'Ada' }) // 'Hi Ada, your order shipped.'
 * t('orders.items', undefined, { count: 3 }) // '3 items'
 *
 * // Per-request locale (emails, notifications) — no global state change:
 * t('orders.shipped', { name: 'Ada' }, { locale: 'fr' }) // 'Bonjour Ada, votre commande est partie.'
 *
 * setLocale('fr') // OK — addTranslations registered 'fr'; an unknown locale throws
 * formatNumber(1234.5) // '1 234,5' (formatting follows the active locale)
 * ```
 *
 * @remarks
 * - Wire it with `setProvider(...)` from `@molecule/api-i18n`, then call the
 *   core's `t()` / `addTranslations()` / `setLocale()` — not methods on this
 *   package. `provider` is a ready-made default instance (locale `'en'`);
 *   `createSimpleI18nProvider(locale, locales)` makes a fresh one.
 * - Placeholders are `{{name}}` (double braces), not `{name}` or `%s`.
 * - Translations are in-memory only: nothing is loaded from disk or a locale
 *   bond automatically — register catalogs with `addTranslations()` (or
 *   `registerLocaleModule()` for a locale bond's exports) at startup.
 * - A key missing in the active locale falls back to English, then to
 *   `defaultValue`, then to the raw key — it never throws.
 * - `setLocale()` changes a PROCESS-WIDE locale; on the API side prefer the
 *   per-call `{ locale }` option so concurrent requests don't race.
 *
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

export * from './browser-guard.js'
export * from './provider.js'
