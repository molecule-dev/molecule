import type { ContactsTranslations } from './types.js'

/** Contacts translations for ko. */
export const ko: Partial<ContactsTranslations> = {
  'contacts.unknown': '알 수 없음',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: 공급자가 설정되지 않았습니다. `ContactsProvider` 구현체를 사용하여 `setProvider()` 호출하십시오. 이 라이브러리에는 공급자가 포함되어 있지 않으므로 네이티브 런타임에서 인터페이스를 구현하고 연결해야 합니다.',
}
