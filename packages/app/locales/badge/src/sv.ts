import type { BadgeTranslations } from './types.js'

/** Badge translations for Swedish. */
export const sv: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Ingen provider angiven. Anropa `setProvider()` med en `BadgeProvider`-implementering — Molecule levererar ingen provider för den; implementera gränssnittet på din native runtime och koppla den.',
}
