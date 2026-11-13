import type { NfcTranslations } from './types.js'

/** Nfc translations for Hungarian. */
export const hu: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `NfcProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
