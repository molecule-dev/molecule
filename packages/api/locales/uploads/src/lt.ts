import type { UploadsTranslations } from './types.js'

/** Uploads translations for Lithuanian. */
export const lt: UploadsTranslations = {
  'uploads.error.noProvider':
    'Įkėlimo teikėjas nesukonfigūruotas. Pirmiausia iškvieskite setProvider().',
  'uploads.error.streamLimitReached': 'Pasiekta srauto riba.',
  'uploads.error.aborted': 'Įkėlimas buvo nutrauktas.',
  'uploads.error.fileTypeBlocked': 'Negalima įkelti {{type}} tipo failų.',
  'uploads.error.activeTypeListed':
    'receiveUploads() nurodo {{type}} – tipą, kurį naršyklė vykdo. Perduokite allowActiveTypes: true, kad jis būtų išsaugotas, ir tuos failus teikite su sendUpload().',
}
