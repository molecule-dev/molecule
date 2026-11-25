import type { UploadsTranslations } from './types.js'

/** Uploads translations for Croatian. */
export const hr: UploadsTranslations = {
  'uploads.error.noProvider':
    'Pružatelj učitavanja nije konfiguriran. Najprije pozovite setProvider().',
  'uploads.error.streamLimitReached': 'Dosegnuto je ograničenje toka.',
  'uploads.error.aborted': 'Učitavanje je prekinuto.',
  'uploads.error.fileTypeBlocked': 'Datoteke vrste {{type}} ne mogu se učitati.',
  'uploads.error.activeTypeListed':
    'receiveUploads() navodi {{type}}, vrstu koju preglednik izvršava. Proslijedite allowActiveTypes: true da je pohranite i poslužujte te datoteke pomoću sendUpload().',
}
