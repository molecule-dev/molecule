import type { ContactsTranslations } from './types.js'

/** Contacts translations for zh. */
export const zh: Partial<ContactsTranslations> = {
  'contacts.unknown': '未知',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`：未设置提供程序。请传入 `ContactsProvider` 实现并调用 `setProvider()`。没有随附的提供程序；请在原生运行时中实现该接口并绑定它。',
}
