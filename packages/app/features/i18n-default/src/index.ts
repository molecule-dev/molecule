/**
 * `@molecule/app-i18n-default` — default i18n bond setup.
 *
 * Bundles the 80-language fleet definitions + `setupI18nDefault()`
 * helper that wires the molecule i18n provider with a primary locale,
 * lazy-loading for every other locale, common-bond translation merging,
 * and locale persistence via the bonded storage provider.
 *
 * Replaces the 113-line `bonds/i18n-default.ts` that every flagship
 * app shipped byte-identically.
 *
 * It imports no UI framework: a React, Vue, Svelte, Solid or Angular app
 * uses this same setup.
 *
 * Pass `supportedLocales`, read from the app's locale file names as in
 * the example. Without it, the setup loads every locale's `ui.ts` at
 * boot to find the empty ones: one request per language on a first visit.
 *
 * The first example lists the files with Vite's `import.meta.glob`. A
 * React Native app is bundled by Metro, where `import.meta.glob` is
 * undefined on a device: it lists one literal `import()` per language,
 * as the second example does (and as `mlcl` writes it for an Expo app).
 *
 * @example
 * ```ts
 * import { setupI18nDefault } from '@molecule/app-i18n-default'
 *
 * import { ui as en } from '../locales/en/ui.js'
 *
 * // Not eager: each locale's ui.ts stays its own chunk, fetched only
 * // when the app switches to that language. The table stays in the
 * // app so Vite can see the files.
 * const localeFiles = import.meta.glob<{ ui: Record<string, string> }>('../locales/*\/ui.ts')
 * const localeCode = (file: string): string =>
 *   file.replace('../locales/', '').replace('/ui.ts', '')
 *
 * const lazyLoadUi = async (code: string): Promise<Record<string, string>> => {
 *   const load = localeFiles[`../locales/${code}/ui.ts`]
 *   return load ? (await load()).ui : {}
 * }
 *
 * setupI18nDefault({
 *   primaryLocale: 'en',
 *   primaryUi: en,
 *   lazyLoadUi,
 *   supportedLocales: Object.keys(localeFiles).map(localeCode),
 * })
 * ```
 *
 * @example
 * ```ts
 * // React Native (Metro): Metro bundles an import() of a literal path, each as its own chunk.
 * import { setupI18nDefault } from '@molecule/app-i18n-default'
 *
 * import { ui as en } from '../locales/en/ui.js'
 *
 * const localeFiles: Record<string, () => Promise<{ ui: Record<string, string> }>> = {
 *   de: () => import('../locales/de/ui.js'),
 *   en: () => import('../locales/en/ui.js'),
 *   fr: () => import('../locales/fr/ui.js'),
 *   'zh-TW': () => import('../locales/zh-TW/ui.js'),
 * }
 *
 * const lazyLoadUi = async (code: string): Promise<Record<string, string>> => {
 *   const load = localeFiles[code]
 *   return load ? (await load()).ui : {}
 * }
 *
 * setupI18nDefault({ enUi: en, lazyLoadUi, supportedLocales: Object.keys(localeFiles) })
 * ```
 *
 * @module
 */

import type { I18nProvider } from '@molecule/app-i18n'
import { en } from '@molecule/app-locales-common/en.js'

import type { SetupI18nDefaultOptions } from './setup.js'
import { setupI18nDefault as setup } from './setup.js'

export * from './languages.js'
export type { PackageLocaleBond, PackageLocaleLoader, SetupI18nDefaultOptions } from './setup.js'

const englishCommon: Record<string, string> = { ...en }

/**
 * Configure i18n with synchronous English common translations when English is primary.
 * Import from `@molecule/app-i18n-default/setup.js` for a different primary locale.
 *
 * @param options - App dictionaries, offered locales, and companion loaders.
 * @returns The configured provider.
 */
export function setupI18nDefault(options: SetupI18nDefaultOptions): I18nProvider {
  return setup(options, (options.primaryLocale ?? 'en') === 'en' ? englishCommon : undefined)
}
