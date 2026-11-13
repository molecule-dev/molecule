import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for ca. */
export const ca: Partial<BluetoothTranslations> = {
  'bluetooth.error.noProvider':
    "`@molecule/app-bluetooth`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `BluetoothProvider` — Molecule no envia cap proveïdor; implementa la interfície al teu temps d'execució natiu i vincula-la.",
}
