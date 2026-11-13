import type { StorageTranslations } from './types.js'

/** Storage translations for Kyrgyz. */
export const ky: StorageTranslations = {
  'storage.error.noProvider':
    'Сактоо провайдери конфигурацияланган эмес. Алгач setProvider() чакырыңыз.',
  'storage.error.quotaExceeded': '"{{key}}" ачкычын орнотууда сактоо квотасы ашып кетти',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` орнотулган эмес. Аны төмөнкү буйрук менен орнотуңуз: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage\'де " {{key}} " ачкычы үчүн маани коюлбай калды',
}
