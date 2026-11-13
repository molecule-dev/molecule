import type { ContactsTranslations } from './types.js'

/** Contacts translations for Catalan. */
export const ca: ContactsTranslations = {
  'contacts.unknown': 'Desconegut',
  'contacts.error.noProvider':
    "`@molecule/app-contacts`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `ContactsProvider` — cap proveïdor s'inclou amb la flota; implementa la interfície al teu temps d'execució natiu i vincula'l.",
}
