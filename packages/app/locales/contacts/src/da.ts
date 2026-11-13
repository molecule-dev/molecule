import type { ContactsTranslations } from './types.js'

/** Contacts translations for Danish. */
export const da: ContactsTranslations = {
  'contacts.unknown': 'Ukendt',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ingen udbyder angivet. Kald `setProvider()` med en `ContactsProvider` implementering — ingen udbyder følger med flåden; implementer grænsefladen på din native runtime og opret en tilknytning.',
}
