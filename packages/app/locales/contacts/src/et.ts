import type { ContactsTranslations } from './types.js'

/** Contacts translations for Estonian. */
export const et: ContactsTranslations = {
  'contacts.unknown': 'Teadmata',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Pakkujat pole määratud. Kutsu `setProvider()` välja `ContactsProvider` implementatsiooniga — Molecule ei paku selle jaoks pakkujat; implementeeri liides oma natiivses käituskeskkonnas ja seo see.',
}
