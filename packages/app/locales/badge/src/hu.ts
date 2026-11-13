import type { BadgeTranslations } from './types.js'

/** Badge translations for Hungarian. */
export const hu: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `BadgeProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
