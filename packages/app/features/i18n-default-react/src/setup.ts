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
export function setupI18nDefault({ enUi, lazyLoadUi }: SetupI18nDefaultOptions): I18nProvider {
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
