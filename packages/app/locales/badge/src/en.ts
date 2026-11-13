import type { BadgeTranslations } from './types.js'

/** Badge translations for English. */
export const en: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: No provider set. Call `setProvider()` with a `BadgeProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
