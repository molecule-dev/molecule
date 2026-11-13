import type { ContactsTranslations } from './types.js'

/** Contacts translations for Romanian. */
export const ro: ContactsTranslations = {
  'contacts.unknown': 'Necunoscut',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare a `ContactsProvider` — Molecule nu oferă niciun furnizor pentru aceasta; implementați interfața pe runtime-ul nativ și creați un link cu acesta.',
}
