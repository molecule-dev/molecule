import type { StorageTranslations } from './types.js'

/** Storage translations for fr. */
export const fr: Partial<StorageTranslations> = {
  'storage.error.quotaExceeded':
    'Quota de stockage dépassé lors de la définition de la clé "{{key}}"',
  'storage.error.noProvider':
    "Le fournisseur de stockage n'est pas configuré. Veuillez d'abord appeler la fonction setProvider().",
  'storage.error.asyncStorageUnavailable':
    "`@react-native-async-storage/async-storage` n'est pas installé. Installez-le avec : `npm install @react-native-async-storage/async-storage`",
  'storage.error.setFailed':
    'Impossible de définir la valeur de la clé « {{key}} » dans AsyncStorage',
}
