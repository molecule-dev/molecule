import type { ContactsTranslations } from './types.js'

/** Contacts translations for nl. */
export const nl: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Onbekend',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Geen provider ingesteld. Roep `setProvider()` aan met een `ContactsProvider` implementatie — er wordt geen provider meegeleverd; implementeer de interface in uw eigen runtime en koppel deze.',
}
