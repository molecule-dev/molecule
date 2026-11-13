import type { ContactsTranslations } from './types.js'

/** Contacts translations for Slovenian. */
export const sl: ContactsTranslations = {
  'contacts.unknown': 'Neznano',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ponudnik ni nastavljen. Pokličite `setProvider()` z implementacijo `ContactsProvider` – Molecule zanj ne dobavlja nobenega ponudnika; implementirajte vmesnik v svojem izvornem izvajalnem okolju in ga povežite.',
}
