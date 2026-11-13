import type { ContactsTranslations } from './types.js'

/** Contacts translations for Afrikaans. */
export const af: ContactsTranslations = {
  'contacts.unknown': 'Onbekend',
  'contacts.error.noProvider':
    "`@molecule/app-contacts`: Geen verskaffer gestel nie. Roep `setProvider()` aan met 'n `ContactsProvider` implementering — Molecule stuur geen verskaffer daarvoor nie; implementeer die koppelvlak op jou oorspronklike looptyd en koppel dit.",
}
