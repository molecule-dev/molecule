import type { ScreenOrientationTranslations } from './types.js'

/** Screen Orientation translations for Hungarian. */
export const hu: ScreenOrientationTranslations = {
  'screenOrientation.error.noProvider':
    '`@molecule/app-screen-orientation`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `ScreenOrientationProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
