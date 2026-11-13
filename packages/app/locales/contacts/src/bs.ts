import type { ContactsTranslations } from './types.js'

/** Contacts translations for Bosnian. */
export const bs: ContactsTranslations = {
  'contacts.unknown': 'Nepoznato',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nije postavljen provajder. Pozovite `setProvider()` s implementacijom `ContactsProvider` — Molecule ne isporučuje provajdera za to; implementirajte interfejs na vašem izvornom okruženju za izvršavanje i povežite ga.',
}
