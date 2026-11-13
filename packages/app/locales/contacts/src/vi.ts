import type { ContactsTranslations } from './types.js'

/** Contacts translations for vi. */
export const vi: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Không xác định',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Chưa thiết lập nhà cung cấp. Hãy gọi `setProvider()` với một triển khai `ContactsProvider` — Molecule không cung cấp nhà cung cấp nào cho nó; hãy triển khai giao diện trên môi trường chạy gốc của bạn và liên kết nó.',
}
