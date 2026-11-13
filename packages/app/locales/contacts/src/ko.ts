import type { ContactsTranslations } from './types.js'

/** Contacts translations for ko. */
export const ko: Partial<ContactsTranslations> = {
  'contacts.unknown': '알 수 없음',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: 설정된 공급자가 없습니다. `ContactsProvider` 구현체를 사용하여 `setProvider()` 호출하십시오. Molecule은 해당 공급자를 제공하지 않으므로 네이티브 런타임에서 인터페이스를 구현하고 연결해야 합니다.',
}
