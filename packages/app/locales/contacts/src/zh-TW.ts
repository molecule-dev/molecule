import type { ContactsTranslations } from './types.js'

/** Contacts translations for Chinese (Traditional). */
export const zhTW: ContactsTranslations = {
  'contacts.unknown': '未知',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`：未設定提供者。請傳入 `ContactsProvider` 實作並呼叫 `setProvider()`。沒有隨附的提供者；請在原生執行環境中實作該介面並綁定它。',
}
