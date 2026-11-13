import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for gl. */
export const gl: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Carga cancelada',
  'fileUpload.error.extensionNotAccepted':
    'Non se acepta a extensión de ficheiro " {{extension}} "',
  'fileUpload.error.maxFiles': 'Alcanzouse o número máximo de ficheiros ({{maxFiles}})',
  'fileUpload.error.maxSize': 'O ficheiro supera o tamaño máximo de {{maxSize}} bytes',
  'fileUpload.error.minSize': 'O ficheiro ten un tamaño inferior a {{minSize}} bytes',
  'fileUpload.error.networkError': 'Fallou a subida debido a un erro de rede',
  'fileUpload.error.noSource': 'Non hai ningún ficheiro fonte dispoñible',
  'fileUpload.error.timedOut': 'Esgotouse o tempo de espera da carga',
  'fileUpload.error.typeNotAccepted': 'Non se acepta o tipo de ficheiro " {{type}} "',
  'fileUpload.error.uploadFailed': 'Fallou a carga',
  'fileUpload.error.uploadFailedStatus': 'Produciuse un erro na subida co estado {{status}}',
}
