import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Nepali. */
export const ne: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: कुनै प्रदायक सेट गरिएको छैन। `FilesystemProvider` कार्यान्वयनको साथ `setProvider()` कल गर्नुहोस् — Molecule ले यसको लागि कुनै प्रदायक पठाउँदैन; तपाईंको नेटिभ रनटाइममा इन्टरफेस लागू गर्नुहोस् र यसलाई बन्ड गर्नुहोस्।',
}
