import type { UploadsTranslations } from './types.js'

/** Uploads translations for Danish. */
export const da: UploadsTranslations = {
  'uploads.error.noProvider': 'Upload-udbyder er ikke konfigureret. Kald setProvider() først.',
  'uploads.error.streamLimitReached': 'Strømgrænsen er nået.',
  'uploads.error.aborted': 'Upload blev afbrudt.',
  'uploads.error.fileTypeBlocked': 'Filer af typen {{type}} kan ikke uploades.',
  'uploads.error.activeTypeListed':
    'receiveUploads() angiver {{type}}, en type som en browser kører. Angiv allowActiveTypes: true for at gemme den, og server de filer med sendUpload().',
}
