import type { ContactsTranslations } from './types.js'

/** Contacts translations for Romanian. */
export const ro: ContactsTranslations = {
  'contacts.unknown': 'Necunoscut',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare `ContactsProvider` — niciun furnizor nu este inclus în flota; implementați interfața pe runtime-ul nativ și conectați-o la link.',
}
