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
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
