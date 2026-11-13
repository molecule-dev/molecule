import type { StorageTranslations } from './types.js'

/** Storage translations for Finnish. */
export const fi: StorageTranslations = {
  'storage.error.noProvider':
    'Tallennuspalveluntarjoajaa ei ole määritetty. Kutsu ensin setProvider().',
  'storage.error.quotaExceeded': 'Tallennustilan kiintiö ylittynyt asetettaessa avainta "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ei ole asennettu. Asenna se komennolla: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Avaimelle " {{key}} " ei voitu asettaa arvoa AsyncStorage-tiedostossa.',
}
