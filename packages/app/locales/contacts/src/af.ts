import type { ContactsTranslations } from './types.js'

/** Contacts translations for Afrikaans. */
export const af: ContactsTranslations = {
  'contacts.unknown': 'Onbekend',
  'contacts.error.noProvider':
    "`@molecule/app-contacts`: Geen verskaffer gestel nie. Roep `setProvider()` met 'n `ContactsProvider` implementering — geen verskaffer word saam met die vloot gestuur nie; implementeer die koppelvlak op jou eie looptyd en koppel dit.",
}
