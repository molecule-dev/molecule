import type { UploadsTranslations } from './types.js'

/** Uploads translations for French. */
export const fr: UploadsTranslations = {
  'uploads.error.noProvider':
    "Le fournisseur de téléversement n'est pas configuré. Appelez d'abord setProvider().",
  'uploads.error.streamLimitReached': 'Limite du flux atteinte.',
  'uploads.error.aborted': 'Le téléversement a été annulé.',
  'uploads.error.fileTypeBlocked': 'Les fichiers de type {{type}} ne peuvent pas être téléversés.',
  'uploads.error.activeTypeListed':
    "receiveUploads() liste {{type}}, un type qu'un navigateur exécute. Passez allowActiveTypes: true pour le stocker, et servez ces fichiers avec sendUpload().",
}
