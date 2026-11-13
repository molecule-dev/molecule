import type { ContactsTranslations } from './types.js'

/** Contacts translations for Russian. */
export const ru: ContactsTranslations = {
  'contacts.unknown': 'Неизвестно',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Поставщик не установлен. Вызовите `setProvider()` с реализацией `ContactsProvider` — Molecule не предоставляет для него поставщика; реализуйте интерфейс в своей собственной среде выполнения и свяжите его.',
}
