import type { StorageTranslations } from './types.js'

/** Storage translations for Lithuanian. */
export const lt: StorageTranslations = {
  'storage.error.noProvider':
    'Saugyklos teikėjas nesukonfigūruotas. Pirmiausia iškvieskite setProvider().',
  'storage.error.quotaExceeded': 'Saugyklos kvota viršyta nustatant raktą "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` neįdiegta. Įdiekite ją naudodami: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Nepavyko nustatyti rakto „ {{key}} “ reikšmės „AsyncStorage“ saugykloje.',
}
