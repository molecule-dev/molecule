/**
 * `@molecule/app-i18n-default-react` — default i18n bond setup.
 *
 * Bundles the 80-language fleet definitions + `setupI18nDefault()`
 * helper that wires the molecule i18n provider with English bootstrap,
 * lazy-loading for every other locale, common-bond translation merging,
 * and locale persistence via the bonded storage provider.
 *
 * Replaces the 113-line `bonds/i18n-default.ts` that every flagship
 * app shipped byte-identically.
 *
 * Pass `supportedLocales`, read from the app's locale file names as in
 * the example. Without it, the setup loads every locale's `ui.ts` at
 * boot to find the empty ones: one request per language on a first visit.
 *
 * @example
 * ```ts
 * import { setupI18nDefault } from '@molecule/app-i18n-default-react'
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
 *   enUi: en,
 *   lazyLoadUi,
 *   supportedLocales: Object.keys(localeFiles).map(localeCode),
 * })
 * ```
 *
 * @module
 */

export * from './languages.js'
export * from './setup.js'
