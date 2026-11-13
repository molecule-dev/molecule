import type { ContactsTranslations } from './types.js'

/** Contacts translations for Croatian. */
export const hr: ContactsTranslations = {
  'contacts.unknown': 'Nepoznato',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nije postavljen pružatelj usluga. Pozovite `setProvider()` s implementacijom `ContactsProvider` — Molecule ne isporučuje pružatelja usluga za to; implementirajte sučelje u svom izvornom okruženju za izvođenje i povežite ga.',
}
