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

// Self-import via barrel so the bundle resolves to the same module
// instance whether the app imports `loadContent` or `* as legal`.
import * as legalDefault from './index.js'

const LEGAL = legalDefault as unknown as Record<string, Record<string, string>>
const legalFor = (code: string): Record<string, string> => LEGAL[code.replace('-', '')] ?? LEGAL.en

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
    provider.addTranslations(loc, legalFor(loc))
  }
  registerContent(module, loader)
  await loader(locale)
}
