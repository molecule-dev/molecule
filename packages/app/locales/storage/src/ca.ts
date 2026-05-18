import type { StorageTranslations } from './types.js'

/** Storage translations for ca. */
export const ca: Partial<StorageTranslations> = {
  'storage.error.quotaExceeded':
    'S\'ha superat la quota d\'emmagatzematge en establir la clau "{{key}}"',
  'storage.error.noProvider':
    'Proveïdor d&#39;emmagatzematge no configurat. Crida primer setProvider().',
}
