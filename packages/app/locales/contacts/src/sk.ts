import type { ContactsTranslations } from './types.js'

/** Contacts translations for Slovak. */
export const sk: ContactsTranslations = {
  'contacts.unknown': 'Neznáme',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Žiadny nastavený poskytovateľ. Zavolajte `setProvider()` s implementáciou `ContactsProvider` – s flotilou nie je dodávaný žiadny poskytovateľ; implementujte rozhranie vo vašom natívnom runtime prostredí a prepojte ho.',
}
