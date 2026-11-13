import type { ContactsTranslations } from './types.js'

/** Contacts translations for Danish. */
export const da: ContactsTranslations = {
  'contacts.unknown': 'Ukendt',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ingen provider angivet. Kald `setProvider()` med en `ContactsProvider` implementering — Molecule sender ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
