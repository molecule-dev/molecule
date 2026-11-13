import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for de. */
export const de: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Upload abgebrochen',
  'fileUpload.error.extensionNotAccepted':
    'Die Dateiendung " {{extension}} " wird nicht akzeptiert.',
  'fileUpload.error.maxFiles': 'Die maximale Anzahl an Dateien ({{maxFiles}}) wurde erreicht',
  'fileUpload.error.maxSize': 'Die Datei überschreitet die maximale Größe von {{maxSize}} Bytes.',
  'fileUpload.error.minSize': 'Die Datei ist kleiner als die Mindestgröße von {{minSize}} Bytes.',
  'fileUpload.error.networkError': 'Der Upload ist aufgrund eines Netzwerkfehlers fehlgeschlagen.',
  'fileUpload.error.noSource': 'Keine Quelldatei verfügbar',
  'fileUpload.error.timedOut': 'Upload-Zeitüberschreitung',
  'fileUpload.error.typeNotAccepted': 'Der Dateityp " {{type}} " wird nicht akzeptiert.',
  'fileUpload.error.uploadFailed': 'Hochladen fehlgeschlagen',
  'fileUpload.error.uploadFailedStatus': 'Upload fehlgeschlagen mit Status {{status}}',
}
