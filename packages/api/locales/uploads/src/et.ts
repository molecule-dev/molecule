import type { UploadsTranslations } from './types.js'

/** Uploads translations for Estonian. */
export const et: UploadsTranslations = {
  'uploads.error.noProvider':
    'Üleslaadimise pakkuja pole seadistatud. Kutsuge esmalt setProvider().',
  'uploads.error.streamLimitReached': 'Voo limiit on saavutatud.',
  'uploads.error.aborted': 'Üleslaadimine katkestati.',
  'uploads.error.fileTypeBlocked': 'Tüüpi {{type}} faile ei saa üles laadida.',
  'uploads.error.activeTypeListed':
    'receiveUploads() loetleb tüüpi {{type}}, mida brauser käivitab. Selle salvestamiseks andke allowActiveTypes: true ja serveerige need failid funktsiooniga sendUpload().',
}
