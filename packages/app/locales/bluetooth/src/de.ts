import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for German. */
export const de: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    '`@molecule/app-bluetooth`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `BluetoothProvider` Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
