import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for fr. */
export const fr: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Téléchargement annulé',
  'fileUpload.error.extensionNotAccepted':
    "L'extension de fichier « {{extension}} » n'est pas acceptée.",
  'fileUpload.error.maxFiles': 'Nombre maximal de fichiers ({{maxFiles}}) atteint',
  'fileUpload.error.maxSize': 'Le fichier dépasse la taille maximale de {{maxSize}} octets.',
  'fileUpload.error.minSize':
    'La taille du fichier est inférieure à la taille minimale de {{minSize}} octets.',
  'fileUpload.error.networkError': "Le chargement a échoué en raison d'une erreur réseau.",
  'fileUpload.error.noSource': 'Aucun fichier source disponible',
  'fileUpload.error.timedOut': "Délai d'attente dépassé.",
  'fileUpload.error.typeNotAccepted': "Le type de fichier « {{type}} » n'est pas accepté.",
  'fileUpload.error.uploadFailed': 'Échec du chargement',
  'fileUpload.error.uploadFailedStatus': 'Le chargement a échoué avec le statut {{status}}',
}
