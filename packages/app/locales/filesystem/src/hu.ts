import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Hungarian. */
export const hu: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `FilesystemProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
