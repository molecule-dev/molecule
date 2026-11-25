import type { UploadsTranslations } from './types.js'

/** Uploads translations for Galician. */
export const gl: UploadsTranslations = {
  'uploads.error.noProvider':
    'O provedor de subida non está configurado. Chame primeiro a setProvider().',
  'uploads.error.streamLimitReached': 'Alcanzouse o límite do fluxo.',
  'uploads.error.aborted': 'A subida foi cancelada.',
  'uploads.error.fileTypeBlocked': 'Non se poden subir ficheiros do tipo {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() inclúe {{type}}, un tipo que o navegador executa. Pasa allowActiveTypes: true para gardalo e serve eses ficheiros con sendUpload().',
}
