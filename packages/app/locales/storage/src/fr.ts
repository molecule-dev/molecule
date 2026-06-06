import type { StorageTranslations } from './types.js'

/** Storage translations for fr. */
export const fr: Partial<StorageTranslations> = {
  'storage.error.quotaExceeded':
    'Quota de stockage dépassé lors de la définition de la clé "{{key}}"',
  'storage.error.noProvider':
    "Le fournisseur de stockage n'est pas configuré. Veuillez d'abord appeler la fonction setProvider().",
}
