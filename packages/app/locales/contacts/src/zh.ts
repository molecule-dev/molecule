import type { ContactsTranslations } from './types.js'

/** Contacts translations for zh. */
export const zh: Partial<ContactsTranslations> = {
  'contacts.unknown': '未知',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`：未设置提供程序。请使用 `ContactsProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
