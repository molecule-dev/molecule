import type { StorageTranslations } from './types.js'

/** Storage translations for Basque. */
export const eu: StorageTranslations = {
  'storage.error.noProvider':
    'Biltegiratze-hornitzailea ez dago konfiguratuta. Deitu setProvider() lehenik.',
  'storage.error.quotaExceeded': 'Biltegiratze-kuota gainditu da "{{key}}" gakoa ezartzean',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ez dago instalatuta. Instalatu `npm install @react-native-async-storage/async-storage` komandoarekin.',
  'storage.error.setFailed': 'Huts egin du " {{key}} " gakoaren balioa AsyncStorage-n ezartzean',
}
