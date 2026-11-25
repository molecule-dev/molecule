import type { UploadsTranslations } from './types.js'

/** Uploads translations for Spanish. */
export const es: UploadsTranslations = {
  'uploads.error.noProvider':
    'El proveedor de subida no está configurado. Llame primero a setProvider().',
  'uploads.error.streamLimitReached': 'Se alcanzó el límite del flujo.',
  'uploads.error.aborted': 'La subida fue cancelada.',
  'uploads.error.fileTypeBlocked': 'No se pueden subir archivos de tipo {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() incluye {{type}}, un tipo que el navegador ejecuta. Pasa allowActiveTypes: true para guardarlo y sirve esos archivos con sendUpload().',
}
