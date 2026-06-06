import type { CameraTranslations } from './types.js'

/** Camera translations for ca. */
export const ca: Partial<CameraTranslations> = {
  'camera.error.previewNoParent': 'La previsualització no té element pare',
  'camera.error.noVideoTrack': 'Sense pista de vídeo',
  'camera.error.canvasContext': "No s'ha pogut obtenir el context del llenç",
  'camera.error.noFileSelected': "No s'ha seleccionat cap fitxer",
  'camera.error.noFilesSelected': "No s'han seleccionat fitxers",
  'camera.error.failedToReadFile': "No s'ha pogut llegir el fitxer",
  'camera.error.videoNotSupported':
    "L'enregistrament de vídeo no és compatible amb el proveïdor web. Utilitzeu el proveïdor natiu.",
  'camera.error.previewNotStarted': "La vista prèvia no s'ha iniciat",
}
