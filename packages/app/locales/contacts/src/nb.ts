import type { ContactsTranslations } from './types.js'

/** Contacts translations for Norwegian Bokmål. */
export const nb: ContactsTranslations = {
  'contacts.unknown': 'Ukjent',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ingen leverandør angitt. Kall `setProvider()` med en `ContactsProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den til.',
}
