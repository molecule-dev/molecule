import type { UploadsTranslations } from './types.js'

/** Uploads translations for Polish. */
export const pl: UploadsTranslations = {
  'uploads.error.noProvider':
    'Dostawca przesyłania nie jest skonfigurowany. Najpierw wywołaj setProvider().',
  'uploads.error.streamLimitReached': 'Osiągnięto limit strumienia.',
  'uploads.error.aborted': 'Przesyłanie zostało przerwane.',
  'uploads.error.fileTypeBlocked': 'Nie można przesyłać plików typu {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() wymienia {{type}}, typ uruchamiany przez przeglądarkę. Przekaż allowActiveTypes: true, aby go zapisać, i udostępniaj te pliki przez sendUpload().',
}
