import type { NfcTranslations } from './types.js'

/** Nfc translations for Polish. */
export const pl: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `NfcProvider` — Molecule nie dostarcza dla niego żadnego dostawcy; zaimplementuj interfejs w swoim natywnym środowisku wykonawczym i powiąż go.',
}
