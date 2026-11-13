import type { ContactsTranslations } from './types.js'

/** Contacts translations for ja. */
export const ja: Partial<ContactsTranslations> = {
  'contacts.unknown': '不明',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: プロバイダーが設定されていません。`ContactsProvider` の実装を `setProvider()` で設定してください — Molecule にはこのプロバイダーが含まれていないため、ネイティブランタイム上でインターフェースを実装してボンドしてください。',
}
