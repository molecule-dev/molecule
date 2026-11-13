import type { ContactsTranslations } from './types.js'

/** Contacts translations for id. */
export const id: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Tidak diketahui',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Tidak ada penyedia yang ditetapkan. Panggil `setProvider()` dengan implementasi `ContactsProvider` — tidak ada penyedia yang disertakan dalam armada; implementasikan antarmuka pada runtime asli Anda dan ikatlah.',
}
