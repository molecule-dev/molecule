import type { BadgeTranslations } from './types.js'

/** Badge translations for Danish. */
export const da: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Ingen provider angivet. Kald `setProvider()` med en `BadgeProvider` implementering — Molecule leverer ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
