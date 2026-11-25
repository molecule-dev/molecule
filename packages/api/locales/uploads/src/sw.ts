import type { UploadsTranslations } from './types.js'

/** Uploads translations for Swahili. */
export const sw: UploadsTranslations = {
  'uploads.error.noProvider': 'Mtoa huduma wa kupakia haijasanidiwa. Piga setProvider() kwanza.',
  'uploads.error.streamLimitReached': 'Kikomo cha mtiririko kimefikiwa.',
  'uploads.error.aborted': 'Upakiaji umeghairiwa.',
  'uploads.error.fileTypeBlocked': 'Faili za aina {{type}} haziwezi kupakiwa.',
  'uploads.error.activeTypeListed':
    'receiveUploads() inaorodhesha {{type}}, aina ambayo kivinjari huiendesha. Pitisha allowActiveTypes: true ili kuihifadhi, na utoe faili hizo kwa sendUpload().',
}
