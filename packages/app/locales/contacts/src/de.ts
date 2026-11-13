import type { ContactsTranslations } from './types.js'

/** Contacts translations for de. */
export const de: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Unbekannt',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `ContactsProvider` -Implementierung auf – es wird kein Provider mitgeliefert; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
