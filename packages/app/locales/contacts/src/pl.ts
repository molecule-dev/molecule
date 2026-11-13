import type { ContactsTranslations } from './types.js'

/** Contacts translations for pl. */
export const pl: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Nieznany',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `ContactsProvider` — żaden dostawca nie jest dostarczany z flotą; zaimplementuj interfejs w swoim natywnym środowisku wykonawczym i powiąż go.',
}
