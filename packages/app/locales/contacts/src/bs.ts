import type { ContactsTranslations } from './types.js'

/** Contacts translations for Bosnian. */
export const bs: ContactsTranslations = {
  'contacts.unknown': 'Nepoznato',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nije postavljen provajder. Pozovite `setProvider()` s implementacijom `ContactsProvider` — nijedan provajder se ne isporučuje s flotom; implementirajte interfejs u vašem izvornom okruženju za izvršavanje i povežite ga.',
}
