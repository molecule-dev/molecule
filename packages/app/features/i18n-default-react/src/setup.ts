import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import * as common from '@molecule/app-locales-common'

import { LANGUAGE_DEFINITIONS } from './languages.js'

const COMMON = common as unknown as Record<string, Record<string, string>>

/**
 * Common translations for `code`. Regional codes fall back to their base
 * language before English (`es-MX` → `esMX` export if present, else `es`,
 * else `en`) — previously a regional locale with no dedicated common export
 * silently got ENGLISH common strings while the rest of the page rendered
 * in the base language.
 */
const commonFor = (code: string): Record<string, string> =>
  COMMON[code.replace('-', '')] ?? COMMON[code.split('-')[0]] ?? COMMON.en

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
 * `enUi` is the eagerly-loaded English UI translations (typically
 * imported as `import { ui as en } from '../locales/en/ui.js'` in
 * the consuming app). `lazyLoadUi` is a per-locale loader the app
 * provides — it MUST remain in the app so Vite can code-split the
 * per-language `ui.ts` bundles correctly.
 */
export interface SetupI18nDefaultOptions {
  /** Eagerly-imported English ui.ts translations. */
  enUi: Record<string, string>
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
   * Optional allowlist of locale codes the app actually supports.
   *
   * When provided, only these locales are registered with the i18n
   * provider — so `useTranslation().locales` (and therefore any
   * language-picker UI built on top of it) renders ONLY supported
   * choices. `'en'` is always included implicitly; the array doesn't
   * need to list it explicitly.
   *
   * When omitted, every entry in the fleet's 80-language
   * {@link LANGUAGE_DEFINITIONS} list is registered (back-compat).
   *
   * Typical call-site idiom uses Vite's `import.meta.glob` to
   * auto-detect which `ui.ts` files in the app's `locales/` directory
   * have non-empty translation objects:
   *
   * ```ts
   * const eager = import.meta.glob<{ ui: Record<string, string> }>(
   *   '../locales/*\/ui.ts',
   *   { eager: true },
   * )
   * const supportedLocales = Object.entries(eager)
   *   .filter(([, m]) => Object.keys(m.ui).length > 0)
   *   .map(([p]) => p.match(/locales\/([^/]+)\/ui\.ts$/)![1])
   * ```
   */
  supportedLocales?: readonly string[]
}

/**
 * Wire the molecule i18n provider with the fleet's 80-language list
 * plus a default English bootstrap, then persist the user's locale
 * selection through the bonded storage provider (if available).
 *
 * Replaces the 113-line per-app `bonds/i18n-default.ts` that every
 * flagship app shipped byte-identically — only the `enUi` import
 * and `lazyLoadUi` template literal had to live in the app to
 * preserve Vite's per-language code splitting.
 *
 * @example
 * ```ts
 * import { setupI18nDefault } from '@molecule/app-i18n-default-react'
 * import { ui as en } from '../locales/en/ui.js'
 *
 * const lazyLoadUi = (code: string) =>
 *   import(`../locales/${code}/ui.ts`).then((m) => m.ui)
 *
 * export function setupI18nDefaultBond(): void {
 *   setupI18nDefault({ enUi: en, lazyLoadUi })
 * }
 * ```
 */
export function setupI18nDefault({
  enUi,
  lazyLoadUi,
  packageLocales,
  supportedLocales,
}: SetupI18nDefaultOptions): I18nProvider {
  const provider = createSimpleI18nProvider(
    'en',
    LANGUAGE_DEFINITIONS.map((lang) => {
      if (lang.code === 'en') {
        return {
          code: lang.code,
          name: lang.name,
          direction: lang.direction,
          translations: { ...common.en, ...enUi },
        }
      }
      return {
        code: lang.code,
        name: lang.name,
        direction: lang.direction,
        loader: () =>
          lazyLoadUi(lang.code).then((ui) => ({
            ...commonFor(lang.code),
            ...ui,
          })),
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
  if (packageLocales && packageLocales.length > 0) {
    registerPackageLocales(provider, packageLocales)
    // Re-assert the app's English UI translations AFTER the package bonds.
    // English is the one locale whose app translations register eagerly (at
    // provider creation), so without this the bonds — merged later — would
    // override `enUi` for overlapping keys, inverting the documented
    // "apps win when they explicitly translate" rule for the default locale.
    // (Non-en locales already preserve the rule: their `lazyLoadUi` merge
    // happens after bond registration.)
    provider.addTranslations('en', enUi)
  }

  // Filter out locales whose app-specific `ui.ts` is empty so the
  // language-picker UI only offers languages the app actually translated.
  //
  // Strategy: register all 80 up-front (so the existing API stays
  // back-compatible and locale-change listeners don't see a "loading
  // languages" state), then asynchronously probe each non-en locale and
  // remove the ones whose `lazyLoadUi` returns an empty object. This is
  // fully automatic — apps don't need to declare their support matrix.
  //
  // Callers can short-circuit the probe by passing `supportedLocales`,
  // which prunes the list synchronously and skips the async work
  // entirely. Useful for tests, for build pipelines that want
  // deterministic startup, or for apps that want to advertise fewer
  // locales than they actually populated.
  if (supportedLocales) {
    const keep = new Set<string>(['en', ...supportedLocales])
    for (const lang of LANGUAGE_DEFINITIONS) {
      if (!keep.has(lang.code)) provider.removeLocale(lang.code)
    }
  } else {
    void pruneUnsupportedLocalesAsync(provider, lazyLoadUi)
  }

  // Persist locale selection through the bonded storage provider (if available).
  import('@molecule/app-storage')
    .then(({ get, set }) => {
      provider.onLocaleChange((locale: string) => {
        set('molecule-locale', locale).catch(() => {
          // No storage provider bonded — locale persistence disabled.
        })
      })
      get<string>('molecule-locale')
        .then((saved: string | null) => {
          if (saved && saved !== provider.getLocale()) {
            provider.setLocale(saved).catch(() => {
              // The saved locale is no longer registered (pruned as unsupported,
              // or dropped in an app update) — keep the default locale instead of
              // surfacing an unhandled rejection on every boot.
            })
          }
        })
        .catch(() => {
          // No storage provider bonded — the package can be installed without a
          // bonded provider (get() then rejects); locale restore is best-effort.
        })
    })
    .catch(() => {
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
): void {
  // Only attach bond translations to locales the fleet list already registered.
  // Without this guard a bond shipping a locale outside LANGUAGE_DEFINITIONS
  // would auto-create it on the provider, adding a phantom entry to the
  // language picker that the supportedLocales pruning never removes.
  const registered = new Set(provider.getLocales().map((l) => l.code))
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
    }
  }
}

/**
 * Concurrency limit for the startup support-probe. Each probe is a
 * dynamic `import()` of a locale's `ui.ts`. In dev mode Vite serves
 * each as a separate HTTP request; in production they share a chunk
 * and the probe is essentially free. Keeping concurrency modest avoids
 * stampeding dev-server connections while still finishing the 79 probes
 * in well under a second on a warm cache.
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
): Promise<void> {
  const candidates = LANGUAGE_DEFINITIONS.map((l) => l.code).filter((c) => c !== 'en')
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
            await provider.setLocale('en')
          }
          provider.removeLocale(code)
        }
      } catch (_error) {
        // Loader failure (missing file, network error, etc.) — treat as
        // unsupported and drop. The provider's removeLocale notifies
        // listeners so any language picker re-renders.
        if (provider.getLocale() === code) {
          try {
            await provider.setLocale('en')
          } catch (_error) {
            // best-effort; if en somehow isn't registered, nothing we can do
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
