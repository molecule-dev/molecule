import type { StorageTranslations } from './types.js'

/** Storage translations for Galician. */
export const gl: StorageTranslations = {
  'storage.error.noProvider':
    'Provedor de almacenamento non configurado. Chame a setProvider() primeiro.',
  'storage.error.quotaExceeded': 'Cota de almacenamento superada ao establecer a clave "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` non está instalado. Instálao con: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Non se puido definir o valor da clave " {{key}} " no almacenamento asíncrono',
}
