import type { UploadsTranslations } from './types.js'

/** Uploads translations for Italian. */
export const it: UploadsTranslations = {
  'uploads.error.noProvider':
    'Il provider di caricamento non è configurato. Chiama prima setProvider().',
  'uploads.error.streamLimitReached': 'Limite dello stream raggiunto.',
  'uploads.error.aborted': 'Il caricamento è stato interrotto.',
  'uploads.error.fileTypeBlocked': 'Non è possibile caricare file di tipo {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() elenca {{type}}, un tipo che il browser esegue. Passa allowActiveTypes: true per memorizzarlo e servi quei file con sendUpload().',
}
