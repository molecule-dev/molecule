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
 * @module
 */

export * from './hooks.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

// Re-export react-i18next hooks and components
export { I18nextProvider, Trans, useTranslation } from 'react-i18next'
