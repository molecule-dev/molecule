import type { ContactsTranslations } from './types.js'

/** Contacts translations for hi. */
export const hi: Partial<ContactsTranslations> = {
  'contacts.unknown': 'अज्ञात',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: कोई प्रदाता सेट नहीं है। `ContactsProvider` कार्यान्वयन के साथ `setProvider()` कॉल करें — Molecule इसके लिए कोई प्रदाता प्रदान नहीं करता है; अपने नेटिव रनटाइम पर इंटरफ़ेस को लागू करें और इसे बॉन्ड करें।',
}
