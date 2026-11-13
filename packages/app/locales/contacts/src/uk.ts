import type { ContactsTranslations } from './types.js'

/** Contacts translations for Ukrainian. */
export const uk: ContactsTranslations = {
  'contacts.unknown': 'Невідомо',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Постачальника не встановлено. Викличте `setProvider()` з реалізацією `ContactsProvider` — постачальник не постачається разом із флотом; реалізуйте інтерфейс у вашому рідному середовищі виконання та зв’яжіть його.',
}
