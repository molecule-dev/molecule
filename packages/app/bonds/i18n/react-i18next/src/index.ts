/**
 * react-i18next provider for molecule.dev.
 *
 * Implements the I18nProvider interface using i18next and react-i18next.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-i18n'
 * import { createReactI18nextProvider } from '@molecule/app-i18n-react-i18next'
 *
 * const provider = createReactI18nextProvider({
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
 * **`setLocale()` contract:** `createReactI18nextProvider()` is a thin
 * wrapper over `@molecule/app-i18n-i18next`'s `createI18nextProvider()`, so
 * its `setLocale()` THROWS for an unregistered locale — see that package's
 * remarks for the fleet-wide contract. The separate `useI18n()` hook below,
 * however, calls `react-i18next`'s raw `i18n.changeLanguage()` directly and
 * is NOT an `I18nProvider` — it does not throw for an unregistered locale.
 *
 * @module
 */

export * from './hooks.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

// Re-export react-i18next hooks and components
export { I18nextProvider, Trans, useTranslation } from 'react-i18next'
