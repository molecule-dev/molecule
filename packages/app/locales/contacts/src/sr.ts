import type { ContactsTranslations } from './types.js'

/** Contacts translations for Serbian. */
export const sr: ContactsTranslations = {
  'contacts.unknown': 'Непознато',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Није подешен провајдер. Позовите `setProvider()` са имплементацијом `ContactsProvider` — Molecule не испоручује провајдера за то; имплементирајте интерфејс на вашем изворном окружењу за извршавање и повежите га.',
}
