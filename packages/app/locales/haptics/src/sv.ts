import type { HapticsTranslations } from './types.js'

/** Haptics translations for Swedish. */
export const sv: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Ingen provider angiven. Anropa `setProvider()` med en `HapticsProvider`-implementering — Molecule levererar ingen provider för den; implementera gränssnittet på din native runtime och koppla den.',
}
