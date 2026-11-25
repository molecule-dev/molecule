import type { UploadsTranslations } from './types.js'

/** Uploads translations for Catalan. */
export const ca: UploadsTranslations = {
  'uploads.error.noProvider':
    'El proveïdor de pujada no està configurat. Crideu setProvider() primer.',
  'uploads.error.streamLimitReached': "S'ha assolit el límit del flux.",
  'uploads.error.aborted': "S'ha cancel·lat la pujada.",
  'uploads.error.fileTypeBlocked': 'No es poden pujar fitxers del tipus {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() inclou {{type}}, un tipus que el navegador executa. Passeu allowActiveTypes: true per desar-lo i serviu aquests fitxers amb sendUpload().',
}
