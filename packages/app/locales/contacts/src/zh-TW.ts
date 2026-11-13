import type { ContactsTranslations } from './types.js'

/** Contacts translations for Chinese (Traditional). */
export const zhTW: ContactsTranslations = {
  'contacts.unknown': '未知',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`：未設定提供者。請使用 `ContactsProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
