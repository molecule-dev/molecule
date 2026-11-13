import type { ContactsTranslations } from './types.js'

/** Contacts translations for Nepali. */
export const ne: ContactsTranslations = {
  'contacts.unknown': 'अज्ञात',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: कुनै प्रदायक सेट गरिएको छैन। `ContactsProvider` कार्यान्वयनको साथ `setProvider()` लाई कल गर्नुहोस् — कुनै पनि प्रदायकले फ्लीटसँग पठाउँदैन; आफ्नो नेटिभ रनटाइममा इन्टरफेस लागू गर्नुहोस् र यसलाई बन्ड गर्नुहोस्।',
}
