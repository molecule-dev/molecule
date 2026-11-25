import type { UploadsTranslations } from './types.js'

/** Uploads translations for German. */
export const de: UploadsTranslations = {
  'uploads.error.noProvider':
    'Upload-Anbieter nicht konfiguriert. Rufen Sie zuerst setProvider() auf.',
  'uploads.error.streamLimitReached': 'Stream-Limit erreicht.',
  'uploads.error.aborted': 'Der Upload wurde abgebrochen.',
  'uploads.error.fileTypeBlocked': 'Dateien vom Typ {{type}} können nicht hochgeladen werden.',
  'uploads.error.activeTypeListed':
    'receiveUploads() nennt {{type}}, einen Typ, den ein Browser ausführt. Übergeben Sie allowActiveTypes: true, um ihn zu speichern, und liefern Sie diese Dateien mit sendUpload() aus.',
}
