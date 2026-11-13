import type { ContactsTranslations } from './types.js'

/** Contacts translations for sv. */
export const sv: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Okänd',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ingen provider angiven. Anropa `setProvider()` med en `ContactsProvider` -implementering — ingen provider levereras med flottan; implementera gränssnittet på din native runtime och koppla den.',
}
