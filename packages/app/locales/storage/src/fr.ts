import type { StorageTranslations } from './types.js'

/** Storage translations for fr. */
export const fr: Partial<StorageTranslations> = {
  'storage.error.quotaExceeded':
    'Quota de stockage dépassé lors de la définition de la clé "{{key}}"',
  'storage.error.noProvider':
    'Le fournisseur de stockage n&#39;est pas configuré. Veuillez d&#39;abord appeler la fonction setProvider().',
}
