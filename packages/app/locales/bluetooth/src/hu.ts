import type { BluetoothTranslations } from './types.js'

/** Bluetooth translations for Hungarian. */
export const hu: BluetoothTranslations = {
  'bluetooth.error.noProvider':
    '`@molecule/app-bluetooth`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `BluetoothProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
