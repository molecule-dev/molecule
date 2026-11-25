import type { UploadsTranslations } from './types.js'

/** Uploads translations for Slovenian. */
export const sl: UploadsTranslations = {
  'uploads.error.noProvider':
    'Ponudnik nalaganja ni konfiguriran. Najprej pokličite setProvider().',
  'uploads.error.streamLimitReached': 'Dosežena je omejitev toka.',
  'uploads.error.aborted': 'Nalaganje je bilo prekinjeno.',
  'uploads.error.fileTypeBlocked': 'Datotek vrste {{type}} ni mogoče naložiti.',
  'uploads.error.activeTypeListed':
    'receiveUploads() navaja {{type}}, vrsto, ki jo brskalnik izvaja. Podajte allowActiveTypes: true, da se shrani, in te datoteke stregite z sendUpload().',
}
