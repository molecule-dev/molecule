/**
 * Framework-agnostic i18next provider for molecule.dev.
 *
 * Implements the I18nProvider interface using i18next directly,
 * without any framework-specific bindings. Suitable for Vue, Angular,
 * Svelte, Solid, and any other framework.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-i18n'
 * import { createI18nextProvider } from '@molecule/app-i18n-i18next'
 *
 * const provider = createI18nextProvider({
 *   defaultLocale: 'en',
 *   locales: [
 *     { code: 'en', name: 'English', translations: { ... } },
 *     { code: 'fr', name: 'French', translations: { ... } },
 *   ],
 * })
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * **Startup locale vs. `detection`:** with `detection: true` (the default),
 * `defaultLocale` is only the FALLBACK — the actual startup locale is
 * whatever the browser detector resolves (querystring, then `navigator`, by
 * default). Apps that want a pinned startup locale must pass
 * `detection: false` (or an explicit `i18nextOptions.lng`).
 *
 * **`setLocale()` contract:** THROWS `Error('Locale "<code>" not found')`
 * for a locale that was never registered — via the `locales` config,
 * `addLocale()`, or `addTranslations()` (all three register it). It does
 * NOT fall through to real i18next's own `changeLanguage()` degrade-to-
 * `fallbackLng` behavior, matching `@molecule/app-i18n`'s core simple
 * provider and `@molecule/api-i18n-simple`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
