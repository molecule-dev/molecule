import type { CameraTranslations } from './types.js'

/** Camera translations for fr. */
export const fr: Partial<CameraTranslations> = {
  'camera.error.noFileSelected': 'Aucun fichier sélectionné',
  'camera.error.noFilesSelected': 'Aucun fichier sélectionné',
  'camera.error.failedToReadFile': 'Impossible de lire le fichier',
  'camera.error.noVideoTrack': 'Aucune piste vidéo',
  'camera.error.canvasContext': "Impossible d'obtenir le contexte du canevas",
  'camera.error.videoNotSupported':
    "L'enregistrement vidéo n'est pas pris en charge par le fournisseur web. Veuillez utiliser le fournisseur natif.",
  'camera.error.previewNotStarted': 'Aperçu non démarré',
  'camera.error.previewNoParent': "L'aperçu n'a pas de parent",
}
