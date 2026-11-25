import type { UploadsTranslations } from './types.js'

/** Uploads translations for Norwegian Bokmål. */
export const nb: UploadsTranslations = {
  'uploads.error.noProvider':
    'Opplastingsleverandør er ikke konfigurert. Kall setProvider() først.',
  'uploads.error.streamLimitReached': 'Strømgrensen er nådd.',
  'uploads.error.aborted': 'Opplastingen ble avbrutt.',
  'uploads.error.fileTypeBlocked': 'Filer av typen {{type}} kan ikke lastes opp.',
  'uploads.error.activeTypeListed':
    'receiveUploads() oppgir {{type}}, en type som en nettleser kjører. Send allowActiveTypes: true for å lagre den, og server de filene med sendUpload().',
}
