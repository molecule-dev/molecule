import type { NfcTranslations } from './types.js'

/** Nfc translations for Danish. */
export const da: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Ingen provider angivet. Kald `setProvider()` med en `NfcProvider` implementering — Molecule sender ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
