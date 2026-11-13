import type { StorageTranslations } from './types.js'

/** Storage translations for Portuguese. */
export const pt: StorageTranslations = {
  'storage.error.noProvider':
    'Provedor de armazenamento não configurado. Chame setProvider() primeiro.',
  'storage.error.quotaExceeded': 'Cota de armazenamento excedida ao definir a chave "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'O pacote `@react-native-async-storage/async-storage` não está instalado. Instale-o com: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Falha ao definir o valor para a chave " {{key}} " em AsyncStorage',
}
