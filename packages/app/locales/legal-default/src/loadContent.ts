/**
 * Drop-in `loadContent(module)` that registers a legal content module
 * (privacyPolicy or termsOfService) with the i18n provider and syncs
 * the current locale's content. Future locale changes re-fetch from
 * the legal-default bond automatically.
 *
 * Lifts the byte-identical `loadContent` function shipped by every
 * flagship app's `src/config.ts` (133 apps) into one source of truth.
 *
 * @module
 */

import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

/**
 * Resolve the locale map at CALL time, not module-evaluation time.
 *
 * `index.ts` re-exports this file, so a top-level `import * as legalDefault
 * from './index.js'` is a cycle: while the barrel is still evaluating, the
 * namespace binding here is `undefined`, and the first click on a legal link
 * threw `Cannot read properties of undefined (reading 'en')` — the modal never
 * opened, in every app using LegalModalLinks. A dynamic import inside the
 * function runs after the graph is fully initialised, and still resolves to the
 * one module instance the barrel exposes.
 *
 * @param code - BCP-47 locale code; `zh-TW` and `zhTW` both resolve.
 * @returns That locale's legal content, falling back to English.
 */
async function legalFor(code: string): Promise<Record<string, string>> {
  const legalDefault = (await import('./index.js')) as unknown as Record<
    string,
    Record<string, string>
  >
  return legalDefault[code.replace('-', '')] ?? legalDefault.en
}

/**
 * Register a legal-content module (privacyPolicy or termsOfService)
 * and sync the current locale's content into the i18n provider.
 * Content comes from this package's per-locale exports; future
 * locale changes re-fetch automatically via `registerContent`.
 */
export async function loadContent(module: string): Promise<void> {
  const provider = getI18nProvider()
  const locale = provider.getLocale()
  const loader = async (loc: string): Promise<void> => {
    provider.addTranslations(loc, await legalFor(loc))
  }
  registerContent(module, loader)
  await loader(locale)
}
