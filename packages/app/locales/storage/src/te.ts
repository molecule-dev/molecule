import type { StorageTranslations } from './types.js'

/** Storage translations for Telugu. */
export const te: StorageTranslations = {
  'storage.error.noProvider':
    'స్టోరేజ్ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు. ముందుగా setProvider() ను కాల్ చేయండి.',
  'storage.error.quotaExceeded': '"{{key}}" కీని సెట్ చేసేటప్పుడు స్టోరేజ్ కోటా మించిపోయింది',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ఇన్‌స్టాల్ చేయబడలేదు. దీనిని `npm install @react-native-async-storage/async-storage` తో ఇన్‌స్టాల్ చేయండి.',
  'storage.error.setFailed': 'AsyncStorageలో " {{key}} " కీకి విలువను సెట్ చేయడంలో విఫలమైంది',
}
