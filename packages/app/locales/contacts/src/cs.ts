import type { ContactsTranslations } from './types.js'

/** Contacts translations for Czech. */
export const cs: ContactsTranslations = {
  'contacts.unknown': 'Neznámé',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `ContactsProvider` — Molecule pro něj nedodává žádného poskytovatele; implementujte rozhraní ve svém nativním běhovém prostředí a propojte ho.',
}
