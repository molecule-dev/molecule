import type { I18nProvider } from '@molecule/app-i18n'
import { loadLocaleModule as loadCommonLocale } from '@molecule/app-locales-common/loader.js'

import { createI18nDefault, type SetupI18nDefaultOptions } from './provider.js'

export type { PackageLocaleBond, PackageLocaleLoader, SetupI18nDefaultOptions } from './provider.js'

/**
 * Common translations for `code`, loaded on demand. Regional codes fall back
 * to their base language before English (`es-MX` → `es`), so a regional locale
 * with no dedicated common export renders the base language rather than
 * silently switching to English.
 *
 * The common bond is imported through its `/loader.js` entry, which pulls ONE
 * language dictionary per call. Importing the bond itself (`import * as
 * common`) ships all 79 of its dictionaries — and any caller that did the same
 * for every companion bond put megabytes of translations in the app's entry
 * chunk, which is exactly what made a scaffolded app's first full load
 * download every language it might ever show.
 */
const commonFor = async (code: string): Promise<Record<string, string>> =>
  (await loadCommonLocale(code)) ?? (await loadCommonLocale('en')) ?? {}

/**
 * Wire the molecule i18n provider with the fleet's 80-language list
 * plus an eager primary dictionary, then persist the user's locale
 * selection through the bonded storage provider (if available).
 *
 * Replaces the 113-line per-app `bonds/i18n-default.ts` that every
 * flagship app shipped byte-identically — only the `enUi` import
 * and `lazyLoadUi` template literal had to live in the app to
 * preserve Vite's per-language code splitting.
 *
 * @param options - App dictionaries, offered locales, and companion loaders.
 * {@link setupI18nDefault} in `offered.js` loads no locale bond itself, for an app whose
 * `packageLocaleLoaders` bring every one, the common bond included.
 *
 * @param primaryCommon - Common translations already loaded for the primary locale.
 * @returns The configured provider.
 *
 * @example
 * ```ts
 * import { setupI18nDefault } from '@molecule/app-i18n-default'
 * import { ui as en } from '../locales/en/ui.js'
 *
 * const localeFiles = import.meta.glob<{ ui: Record<string, string> }>('../locales/*\/ui.ts')
 * const lazyLoadUi = async (code: string): Promise<Record<string, string>> => {
 *   const load = localeFiles[`../locales/${code}/ui.ts`]
 *   return load ? (await load()).ui : {}
 * }
 *
 * export function setupI18nDefaultBond(): void {
 *   setupI18nDefault({
 *     enUi: en,
 *     lazyLoadUi,
 *     supportedLocales: Object.keys(localeFiles).map((file) =>
 *       file.replace('../locales/', '').replace('/ui.ts', ''),
 *     ),
 *   })
 * }
 * ```
 */
export function setupI18nDefault(
  options: SetupI18nDefaultOptions,
  primaryCommon?: Record<string, string>,
): I18nProvider {
  return createI18nDefault(options, commonFor, primaryCommon)
}
