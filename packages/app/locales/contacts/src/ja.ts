import type { ContactsTranslations } from './types.js'

/** Contacts translations for ja. */
export const ja: Partial<ContactsTranslations> = {
  'contacts.unknown': '不明',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: プロバイダーが設定されていません。`ContactsProvider` の実装を渡して `setProvider()` を呼び出してください。同梱のプロバイダーはありません。ネイティブランタイムでインターフェースを実装し、ボンドしてください。',
}
