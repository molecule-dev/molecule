import type { ContactsTranslations } from './types.js'

/** Contacts translations for vi. */
export const vi: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Không xác định',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Chưa thiết lập nhà cung cấp. Hãy gọi `setProvider()` với một triển khai `ContactsProvider` — không có nhà cung cấp nào được tích hợp sẵn; hãy triển khai giao diện trên môi trường chạy gốc của bạn và liên kết nó.',
}
