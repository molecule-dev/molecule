import type { UploadsTranslations } from './types.js'

/** Uploads translations for Afrikaans. */
export const af: UploadsTranslations = {
  'uploads.error.noProvider':
    'Oplaai-verskaffer is nie gekonfigureer nie. Roep eers setProvider() aan.',
  'uploads.error.streamLimitReached': 'Stroomlimiet bereik.',
  'uploads.error.aborted': 'Oplaai is gekanselleer.',
  'uploads.error.fileTypeBlocked': 'Lêers van die tipe {{type}} kan nie opgelaai word nie.',
  'uploads.error.activeTypeListed':
    "receiveUploads() lys {{type}}, 'n tipe wat 'n blaaier uitvoer. Gee allowActiveTypes: true om dit te stoor, en bedien daardie lêers met sendUpload().",
}
