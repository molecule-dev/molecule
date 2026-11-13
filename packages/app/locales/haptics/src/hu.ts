import type { HapticsTranslations } from './types.js'

/** Haptics translations for Hungarian. */
export const hu: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `HapticsProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és kösd össze.',
}
