import type { ContactsTranslations } from './types.js'

/** Contacts translations for tr. */
export const tr: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Bilinmiyor',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Sağlayıcı ayarlanmadı. `ContactsProvider` uygulamasıyla `setProvider()` işlevini çağırın — filoda hiçbir sağlayıcı bulunmuyor; arayüzü yerel çalışma zamanınızda uygulayın ve bağlayın.',
}
