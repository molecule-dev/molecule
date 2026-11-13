import type { ContactsTranslations } from './types.js'

/** Contacts translations for Hungarian. */
export const hu: ContactsTranslations = {
  'contacts.unknown': 'Ismeretlen',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `ContactsProvider` implementációval – a flottához nem tartozik szolgáltató; implementáld a felületet a natív futtatókörnyezeteden, és kösd össze.',
}
