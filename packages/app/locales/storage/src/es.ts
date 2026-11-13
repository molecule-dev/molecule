import type { StorageTranslations } from './types.js'

/** Storage translations for Spanish. */
export const es: StorageTranslations = {
  'storage.error.noProvider':
    'Proveedor de almacenamiento no configurado. Llame a setProvider() primero.',
  'storage.error.quotaExceeded':
    'Cuota de almacenamiento excedida al establecer la clave "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` no está instalado. Instálalo con: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'No se pudo establecer el valor para la clave " {{key}} " en AsyncStorage.',
}
