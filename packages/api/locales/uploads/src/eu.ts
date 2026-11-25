import type { UploadsTranslations } from './types.js'

/** Uploads translations for Basque. */
export const eu: UploadsTranslations = {
  'uploads.error.noProvider':
    'Igoera-hornitzailea ez dago konfiguratuta. Lehenik setProvider() deitu.',
  'uploads.error.streamLimitReached': 'Korrontearen muga gainditu da.',
  'uploads.error.aborted': 'Igoera bertan behera utzi da.',
  'uploads.error.fileTypeBlocked': 'Ezin dira {{type}} motako fitxategiak igo.',
  'uploads.error.activeTypeListed':
    'receiveUploads()-k {{type}} zerrendatzen du, nabigatzaile batek exekutatzen duen mota. Pasatu allowActiveTypes: true gordetzeko, eta zerbitzatu fitxategi horiek sendUpload() bidez.',
}
