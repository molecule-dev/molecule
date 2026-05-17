import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { I18nProvider } from '@molecule/app-i18n'
import * as common from '@molecule/app-locales-common'

import { LANGUAGE_DEFINITIONS } from './languages.js'

const COMMON = common as unknown as Record<string, Record<string, string>>

/** Common translations for `code`, falling back to English. */
const commonFor = (code: string): Record<string, string> =>
  COMMON[code.replace('-', '')] ?? COMMON.en

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
   * Optional allowlist of locale codes the app actually supports.
   *
   * When provided, only these locales are registered with the i18n
   * provider — so `useTranslation().locales` (and therefore any
   * language-picker UI built on top of it) renders ONLY supported
   * choices. `'en'` is always included implicitly; the array doesn't
   * need to list it explicitly.
   *
   * When omitted, every entry in the fleet's 74-language
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
 * Wire the molecule i18n provider with the fleet's 74-language list
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

  // Filter out locales whose app-specific `ui.ts` is empty so the
  // language-picker UI only offers languages the app actually translated.
  //
  // Strategy: register all 74 up-front (so the existing API stays
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
      provider.onLocaleChange((locale: string) => set('molecule-locale', locale))
      get<string>('molecule-locale').then((saved: string | null) => {
        if (saved && saved !== provider.getLocale()) provider.setLocale(saved)
      })
    })
    .catch(() => {
      // Storage package not installed — locale persistence disabled.
    })

  return provider
}

/**
 * Concurrency limit for the startup support-probe. Each probe is a
 * dynamic `import()` of a locale's `ui.ts`. In dev mode Vite serves
 * each as a separate HTTP request; in production they share a chunk
 * and the probe is essentially free. Keeping concurrency modest avoids
 * stampeding dev-server connections while still finishing the 73 probes
 * in well under a second on a warm cache.
 */
const PROBE_CONCURRENCY = 6

async function pruneUnsupportedLocalesAsync(
  provider: I18nProvider,
  lazyLoadUi: (code: string) => Promise<Record<string, string>>,
): Promise<void> {
  const candidates = LANGUAGE_DEFINITIONS.map((l) => l.code).filter((c) => c !== 'en')
  let i = 0
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
      } catch {
        // Loader failure (missing file, network error, etc.) — treat as
        // unsupported and drop. The provider's removeLocale notifies
        // listeners so any language picker re-renders.
        if (provider.getLocale() === code) {
          try {
            await provider.setLocale('en')
          } catch {
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
