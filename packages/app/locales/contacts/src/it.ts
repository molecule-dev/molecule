import type { ContactsTranslations } from './types.js'

/** Contacts translations for it. */
export const it: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Sconosciuto',
  'contacts.error.noProvider':
    "`@molecule/app-contacts`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `ContactsProvider` : nessun provider è incluso nella flotta; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
