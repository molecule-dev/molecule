import type { ContactsTranslations } from './types.js'

/** Contacts translations for Hungarian. */
export const hu: ContactsTranslations = {
  'contacts.unknown': 'Ismeretlen',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `ContactsProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futási környezetedben, és bondold azt.',
}
