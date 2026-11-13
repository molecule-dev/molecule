import type { ContactsTranslations } from './types.js'

/** Contacts translations for Slovak. */
export const sk: ContactsTranslations = {
  'contacts.unknown': 'Neznáme',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nie je nastavený žiadny poskytovateľ. Zavolajte `setProvider()` s implementáciou `ContactsProvider` — Molecule preň neposkytuje žiadneho poskytovateľa; implementujte rozhranie vo vašom natívnom runtime prostredí a prepojte ho.',
}
