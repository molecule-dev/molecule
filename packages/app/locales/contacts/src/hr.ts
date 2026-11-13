import type { ContactsTranslations } from './types.js'

/** Contacts translations for Croatian. */
export const hr: ContactsTranslations = {
  'contacts.unknown': 'Nepoznato',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nije postavljen pružatelj usluga. Pozovite `setProvider()` s implementacijom `ContactsProvider` — nijedan pružatelj usluga ne dolazi s flotom; implementirajte sučelje u svom izvornom okruženju za izvođenje i povežite ga.',
}
