import type { ContactsTranslations } from './types.js'

/** Contacts translations for tr. */
export const tr: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Bilinmiyor',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Sağlayıcı ayarlanmadı. `ContactsProvider` uygulamasıyla `setProvider()` işlevini çağırın — Molecule bunun için bir sağlayıcı sunmuyor; arayüzü yerel çalışma ortamınızda uygulayın ve bağlayın.',
}
