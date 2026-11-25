import type { UploadsTranslations } from './types.js'

/** Uploads translations for Romanian. */
export const ro: UploadsTranslations = {
  'uploads.error.noProvider':
    'Furnizorul de încărcare nu este configurat. Apelați mai întâi setProvider().',
  'uploads.error.streamLimitReached': 'Limita fluxului a fost atinsă.',
  'uploads.error.aborted': 'Încărcarea a fost anulată.',
  'uploads.error.fileTypeBlocked': 'Fișierele de tip {{type}} nu pot fi încărcate.',
  'uploads.error.activeTypeListed':
    'receiveUploads() include {{type}}, un tip pe care browserul îl rulează. Transmiteți allowActiveTypes: true pentru a-l stoca și serviți acele fișiere cu sendUpload().',
}
