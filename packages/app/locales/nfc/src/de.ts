import type { NfcTranslations } from './types.js'

/** Nfc translations for German. */
export const de: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `NfcProvider`-Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
