import type { UploadsTranslations } from './types.js'

/** Uploads translations for Bosnian. */
export const bs: UploadsTranslations = {
  'uploads.error.noProvider': 'Provajder za upload nije konfigurisan. Prvo pozovite setProvider().',
  'uploads.error.streamLimitReached': 'Dostignut je limit toka.',
  'uploads.error.aborted': 'Otpremanje je prekinuto.',
  'uploads.error.fileTypeBlocked': 'Datoteke tipa {{type}} se ne mogu otpremiti.',
  'uploads.error.activeTypeListed':
    'receiveUploads() navodi {{type}}, tip koji preglednik izvršava. Proslijedite allowActiveTypes: true da ga pohranite i poslužujte te datoteke pomoću sendUpload().',
}
