import type { ContactsTranslations } from './types.js'

/** Contacts translations for Bulgarian. */
export const bg: ContactsTranslations = {
  'contacts.unknown': 'Неизвестно',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Няма зададен доставчик. Извикайте `setProvider()` с имплементация на `ContactsProvider` — Molecule не предоставя доставчик за него; имплементирайте интерфейса в собствената си среда за изпълнение и го свържете.',
}
