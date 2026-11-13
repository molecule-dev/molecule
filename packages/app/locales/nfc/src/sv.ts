import type { NfcTranslations } from './types.js'

/** Nfc translations for Swedish. */
export const sv: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Ingen provider angiven. Anropa `setProvider()` med en `NfcProvider`-implementering — Molecule levererar ingen provider för den; implementera gränssnittet på din native runtime och koppla den.',
}
