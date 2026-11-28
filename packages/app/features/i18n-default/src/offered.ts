import type { I18nProvider } from '@molecule/app-i18n'

import { createI18nDefault, type SetupI18nDefaultOptions } from './provider.js'

export type { PackageLocaleBond, PackageLocaleLoader, SetupI18nDefaultOptions } from './provider.js'

/**
 * {@link setupI18nDefault} for an app whose `packageLocaleLoaders` bring every locale bond,
 * `@molecule/app-locales-common` included. This entry imports no locale bond, so the app's build
 * holds only the languages its loaders import. The default entry loads the common bond through its
 * `loader.js`, which lists all 79 languages, and a bundler builds a chunk for each of them.
 *
 * @param options - App dictionaries, offered locales, and the companion loaders, the common
 *   bond's among them.
 * @returns The configured provider.
 */
export function setupI18nDefault(options: SetupI18nDefaultOptions): I18nProvider {
  return createI18nDefault(options, async () => ({}), {})
}
