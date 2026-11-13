import type { ContactsTranslations } from './types.js'

/** Contacts translations for English. */
export const en: ContactsTranslations = {
  'contacts.unknown': 'Unknown',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: No provider set. Call `setProvider()` with a `ContactsProvider` implementation — no provider ships with the fleet; implement the interface on your native runtime and bond it.',
}
