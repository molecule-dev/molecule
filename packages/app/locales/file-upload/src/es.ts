import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for es. */
export const es: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Carga cancelada',
  'fileUpload.error.extensionNotAccepted':
    'La extensión de archivo " {{extension}} " no es aceptada.',
  'fileUpload.error.maxFiles': 'Se ha alcanzado el número máximo de archivos ({{maxFiles}}).',
  'fileUpload.error.maxSize': 'El archivo excede el tamaño máximo de {{maxSize}} bytes.',
  'fileUpload.error.minSize': 'El archivo tiene un tamaño inferior al mínimo de {{minSize}} bytes.',
  'fileUpload.error.networkError': 'La carga falló debido a un error de red.',
  'fileUpload.error.noSource': 'No hay archivo fuente disponible',
  'fileUpload.error.timedOut': 'La carga ha caducado.',
  'fileUpload.error.typeNotAccepted': 'El tipo de archivo " {{type}} " no es aceptado.',
  'fileUpload.error.uploadFailed': 'Error al cargar',
  'fileUpload.error.uploadFailedStatus': 'La carga falló con el estado {{status}}',
}
