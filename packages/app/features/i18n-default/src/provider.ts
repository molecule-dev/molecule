import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { LANGUAGE_DEFINITIONS } from './languages.js'

/**
 * One companion bond's lazy per-language loader — the `loadLocaleModule`
 * export of `@molecule/app-locales-<name>/loader.js`.
 *
 * @param code - Locale code, e.g. `en`, `pt`, `zh-TW`.
 * @returns That bond's translations for the locale, or `undefined` when the
 * bond has none.
 */
export type PackageLocaleLoader = (code: string) => Promise<Record<string, string> | undefined>

/**
 * Shape of a per-package locale bond passed via `packageLocales`.
 *
 * Locale bond packages (`@molecule/app-locales-<name>`) follow a
 * uniform layout: each `<lang>.ts` file exports a constant matching
 * the locale code, and the package's `src/index.ts` re-exports all
 * of them as a barrel. Consumers do `import * as bond from
 * '@molecule/app-locales-<name>'` to get an object keyed by locale
 * code (with `types` and a few non-locale exports also present).
 *
 * This type captures the "anything except the types module is a
 * `{lang: translations}` map" shape via Record<string, unknown> with
 * a per-key runtime filter at registration time.
 */
export type PackageLocaleBond = Record<string, unknown>

/**
 * Options accepted by `setupI18nDefault`.
 *
 * Import the primary UI dictionary eagerly and pass it as `primaryUi` with its
 * `primaryLocale` code. Existing English-first callers can pass `enUi`.
 */
export type SetupI18nDefaultOptions = (
  | { enUi: Record<string, string>; primaryLocale?: never; primaryUi?: never }
  | { enUi?: never; primaryLocale: string; primaryUi: Record<string, string> }
) & {
  /**
   * Per-locale lazy loader for the app's `ui.ts`. The callback runs
   * on demand when the i18n provider switches to that locale; merging
   * with the universal common-locale bond is handled inside this
   * package, so callers only need to return the app-specific UI keys.
   */
  lazyLoadUi: (code: string) => Promise<Record<string, string>>
  /**
   * Per-package locale bonds to eagerly register with the i18n provider.
   *
   * Each entry is a star-imported `@molecule/app-locales-<name>` module.
   * Every property that LOOKS like a locale (matches `^[a-z]{2,3}(-[A-Z]{2,4})?$`
   * and resolves to a non-empty object of string values) is registered
   * via `provider.addTranslations(lang, translations)` at setup time.
   *
   * @example
   * ```ts
   * import * as authLocales from '@molecule/app-locales-auth'
   * import * as legalLocales from '@molecule/app-locales-legal-default'
   *
   * setupI18nDefault({
   *   enUi: en,
   *   lazyLoadUi,
   *   packageLocales: [authLocales, legalLocales],
   * })
   * ```
   *
   * Per-app `ui.ts` (registered via `lazyLoadUi`) still overrides
   * package-locale translations because it's merged in second.
   */
  packageLocales?: readonly PackageLocaleBond[]
  /**
   * Per-package locale bonds registered LAZILY, one language at a time.
   *
   * Each entry is that bond's `loadLocaleModule` export, imported from
   * `@molecule/app-locales-<name>/loader.js`. Nothing from these bonds is in
   * the entry bundle: the loader is called with a locale code the first time
   * that locale is selected, and only that language's dictionary is fetched.
   *
   * Prefer this over {@link packageLocales}: a star-import of the bond pulls
   * every one of its ~79 dictionaries into the importing chunk (several
   * megabytes across a typical app's dependencies).
   *
   * @example
   * ```ts
   * import { loadLocaleModule as authLocales } from '@molecule/app-locales-auth/loader.js'
   *
   * setupI18nDefault({ enUi: en, lazyLoadUi, packageLocaleLoaders: [authLocales] })
   * ```
   */
  packageLocaleLoaders?: readonly PackageLocaleLoader[]
  /**
   * Optional allowlist of locale codes the app actually supports.
   *
   * When provided, only these locales are registered with the i18n
   * provider — so `useTranslation().locales` (and therefore any
   * language-picker UI built on top of it) renders ONLY supported
   * choices. The primary locale is always included.
   *
   * When omitted, every entry in the fleet's 80-language
   * {@link LANGUAGE_DEFINITIONS} list is registered, then each secondary
   * locale's `ui.ts` is loaded through `lazyLoadUi` at boot and the empty
   * ones are removed: one request per language on a first visit.
   *
   * Read it from the app's locale file names with a NON-eager
   * `import.meta.glob`, which fetches nothing to build the list
   * (`{ eager: true }` would put every language in the entry chunk):
   *
   * ```ts
   * const localeFiles = import.meta.glob<{ ui: Record<string, string> }>('../locales/*\/ui.ts')
   * const supportedLocales = Object.keys(localeFiles).map((file) =>
   *   file.replace('../locales/', '').replace('/ui.ts', ''),
   * )
   * ```
   */
  supportedLocales?: readonly string[]
  /** Optional factory for apps using an alternate i18n bond. */
  createProvider?: (primaryLocale: string, locales: LocaleConfig[]) => I18nProvider
}

/**
 * The provider {@link setupI18nDefault} builds, with the common bond's strings loaded by
 * `commonFor`. It imports no locale bond: `setup.js` passes the common bond's loader, and
 * `offered.js` passes none, for an app whose `packageLocaleLoaders` bring the common strings.
 *
 * @param options - App dictionaries, offered locales, and companion loaders.
 * @param commonFor - Loads the common bond's strings for one locale.
 * @param primaryCommon - Common translations already loaded for the primary locale.
 * @returns The configured provider.
 */
export function createI18nDefault(
  {
    enUi,
    primaryLocale = 'en',
    primaryUi,
    lazyLoadUi,
    packageLocales,
    packageLocaleLoaders,
    supportedLocales,
    createProvider = (code, locales) => createSimpleI18nProvider(code, locales, code),
  }: SetupI18nDefaultOptions,
  commonFor: (code: string) => Promise<Record<string, string>>,
  primaryCommon?: Record<string, string>,
): I18nProvider {
  const ui = primaryUi ?? enUi
  if (!ui || !LANGUAGE_DEFINITIONS.some(({ code }) => code === primaryLocale)) {
    throw new Error(`Invalid primary locale "${primaryLocale}" or missing primary UI catalog`)
  }
  /**
   * Translations contributed by the lazily-registered companion bonds for one
   * locale. A bond that has no dictionary for the code resolves `undefined`;
   * a bond whose loader rejects is reported and skipped, because one broken
   * companion must not make every other locale unusable (the app's own `ui.ts`
   * and the common bond still render).
   */
  const packageTranslations = async (code: string): Promise<Record<string, string>> => {
    if (!packageLocaleLoaders || packageLocaleLoaders.length === 0) return {}
    const loaded = await Promise.allSettled(packageLocaleLoaders.map((load) => load(code)))
    const merged: Record<string, string> = {}
    for (const result of loaded) {
      if (result.status === 'fulfilled') {
        if (result.value) Object.assign(merged, result.value)
      } else {
        console.warn(
          `[molecule:i18n] a companion locale bond failed to load locale "${code}" — continuing without it`,
          result.reason,
        )
      }
    }
    return merged
  }

  const offered = supportedLocales ? new Set([primaryLocale, ...supportedLocales]) : undefined
  const languages = LANGUAGE_DEFINITIONS.filter(({ code }) => !offered || offered.has(code))
  const provider = createProvider(
    primaryLocale,
    languages.map((lang) => {
      if (lang.code === primaryLocale) {
        return {
          code: lang.code,
          name: lang.name,
          direction: lang.direction,
          translations: { ...primaryCommon, ...ui },
        }
      }
      return {
        code: lang.code,
        name: lang.name,
        direction: lang.direction,
        loader: async () => {
          // Merge order is the documented precedence: common bond < companion
          // bonds < the app's own ui.ts.
          const [common, packages, ui] = await Promise.all([
            commonFor(lang.code),
            packageTranslations(lang.code),
            lazyLoadUi(lang.code),
          ])
          return { ...common, ...packages, ...ui }
        },
      }
    }),
  )

  setProvider(provider)

  // Register per-package locale bonds eagerly. Each bond is a
  // `@molecule/app-locales-<name>` star-import whose properties are
  // locale codes → translation records. We loop the package's exports,
  // filter out anything that isn't a locale (types, helpers, etc.),
  // and call addTranslations once per (bond, lang).
  //
  // Order matters: per-package bonds are registered BEFORE the per-app
  // `lazyLoadUi` resolves, so per-app translations override per-package
  // ones (preserving the "apps win when they explicitly translate" rule).
  const eagerPrimary = packageLocales?.length
    ? registerPackageLocales(provider, packageLocales, primaryLocale)
    : {}
  if (Object.keys(eagerPrimary).length > 0) provider.addTranslations(primaryLocale, ui)

  // Fetch only the primary language at startup. Its app dictionary is ready for first paint.
  if (!primaryCommon || packageLocaleLoaders?.length) {
    void Promise.all([
      primaryCommon ?? commonFor(primaryLocale),
      packageTranslations(primaryLocale),
    ]).then(([common, packages]) => {
      provider.addTranslations(primaryLocale, { ...common, ...eagerPrimary, ...packages, ...ui })
    })
  }
  if (!supportedLocales) {
    void pruneUnsupportedLocalesAsync(provider, lazyLoadUi, primaryLocale)
  }

  // Persist locale selection through the bonded storage provider (if available).
  import('@molecule/app-storage')
    .then(({ get, set }) => {
      provider.onLocaleChange((locale: string) => {
        set('molecule-locale', locale).catch((_error) => {
          // No storage provider bonded — locale persistence disabled.
        })
      })
      get<string>('molecule-locale')
        .then((saved: string | null) => {
          if (saved && saved !== provider.getLocale()) {
            provider.setLocale(saved).catch((_error) => {
              // The saved locale is no longer registered (pruned as unsupported,
              // or dropped in an app update) — keep the default locale instead of
              // surfacing an unhandled rejection on every boot.
            })
          }
        })
        .catch((_error) => {
          // No storage provider bonded — the package can be installed without a
          // bonded provider (get() then rejects); locale restore is best-effort.
        })
    })
    .catch((_error) => {
      // Storage package not installed — locale persistence disabled.
    })

  return provider
}

/**
 * BCP-47-ish locale code matcher used to identify which exports of a
 * `@molecule/app-locales-<name>` package are actually locale records
 * (vs. types, registration helpers, etc.). Matches the same shape as
 * {@link LANGUAGE_DEFINITIONS} entries: 2-3 lowercase letters, optional
 * regional `-XX` suffix.
 */
const LOCALE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/

/**
 * Check whether an arbitrary value is a non-empty translation record:
 * a plain object whose values are all strings.
 */
function isTranslationRecord(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== 'object') return false
  const entries = Object.entries(v as Record<string, unknown>)
  if (entries.length === 0) return false
  return entries.every(([, val]) => typeof val === 'string')
}

/**
 * Walk each `packageLocales` entry, identify properties whose key matches
 * a locale code AND whose value is a translation record, and register
 * those with the provider via `addTranslations`. Silently skips entries
 * that aren't locale records (e.g. `types`, `register`, etc.) so the
 * caller can pass a star-import without filtering.
 */
function registerPackageLocales(
  provider: I18nProvider,
  packageLocales: readonly PackageLocaleBond[],
  primaryLocale: string,
): Record<string, string> {
  // Only attach bond translations to locales the fleet list already registered.
  // Without this guard a bond shipping a locale outside LANGUAGE_DEFINITIONS
  // would auto-create it on the provider, adding a phantom entry to the
  // language picker that the supportedLocales pruning never removes.
  const registered = new Set(provider.getLocales().map((l) => l.code))
  const primary: Record<string, string> = {}
  for (const bond of packageLocales) {
    for (const [exportName, maybeTranslations] of Object.entries(bond)) {
      // Normalize regional codes: locale bonds export `zhTW` / `esMX`
      // (a hyphen is not valid in an ES export identifier) while the fleet's
      // LANGUAGE_DEFINITIONS use canonical `zh-TW` / `es-MX`. Mirror the
      // `registerLocaleModule` mapping in `@molecule/app-i18n` — without it,
      // every bond's regional translations were silently dropped here (the
      // regex rejects `zhTW`, and `registered` only holds `zh-TW`).
      const maybeCode = exportName.replace(
        /^([a-z]{2,3})([A-Z][a-zA-Z]{1,3})$/,
        (_, base, region) => `${base}-${region}`,
      )
      if (!LOCALE_CODE_RE.test(maybeCode)) continue
      if (!registered.has(maybeCode)) continue
      if (!isTranslationRecord(maybeTranslations)) continue
      provider.addTranslations(maybeCode, maybeTranslations)
      if (maybeCode === primaryLocale) Object.assign(primary, maybeTranslations)
    }
  }
  return primary
}

/**
 * Concurrency limit for the startup support-probe. Each probe is a
 * dynamic `import()` of a locale's `ui.ts`. In dev mode Vite serves
 * each as a separate HTTP request; production builds can split them into
 * separate chunks too. The limit bounds concurrent imports, not the total
 * startup work. Pass supportedLocales to avoid fetching every language just
 * to discover the support list.
 */
const PROBE_CONCURRENCY = 6

/**
 * Asynchronously probes each non-English locale via `lazyLoadUi` and removes
 * any that return an empty translation object, keeping the language picker in
 * sync with what the app has actually translated.
 */
async function pruneUnsupportedLocalesAsync(
  provider: I18nProvider,
  lazyLoadUi: (code: string) => Promise<Record<string, string>>,
  primaryLocale: string,
): Promise<void> {
  const candidates = LANGUAGE_DEFINITIONS.map((l) => l.code).filter((c) => c !== primaryLocale)
  let i = 0
  /**
   * Processes locale candidates in the shared `candidates` array up to
   * concurrency limit, probing each and removing unsupported ones.
   */
  async function worker(): Promise<void> {
    while (i < candidates.length) {
      const code = candidates[i++]
      try {
        const ui = await lazyLoadUi(code)
        if (!ui || Object.keys(ui).length === 0) {
          if (provider.getLocale() === code) {
            await provider.setLocale(primaryLocale)
          }
          provider.removeLocale(code)
        }
      } catch (_error) {
        // Loader failure (missing file, network error, etc.) — treat as
        // unsupported and drop. The provider's removeLocale notifies
        // listeners so any language picker re-renders.
        if (provider.getLocale() === code) {
          try {
            await provider.setLocale(primaryLocale)
          } catch (_error) {
            // An app can remove its primary locale while this probe is running.
          }
        }
        provider.removeLocale(code)
      }
    }
  }
  const workers = Array.from({ length: Math.min(PROBE_CONCURRENCY, candidates.length) }, () =>
    worker(),
  )
  await Promise.all(workers)
}
