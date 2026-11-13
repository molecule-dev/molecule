import type { ContactsTranslations } from './types.js'

/** Contacts translations for Macedonian. */
export const mk: ContactsTranslations = {
  'contacts.unknown': 'Непознато',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Не е поставен провајдер. Повикајте `setProvider()` со имплементација на `ContactsProvider` — Molecule не испорачува провајдер за тоа; имплементирајте го интерфејсот на вашето матичко извршување и поврзете го.',
}
