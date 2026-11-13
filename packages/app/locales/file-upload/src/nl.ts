import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for nl. */
export const nl: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Upload geannuleerd',
  'fileUpload.error.extensionNotAccepted':
    'De bestandsextensie " {{extension}} " wordt niet geaccepteerd.',
  'fileUpload.error.maxFiles': 'Het maximale aantal bestanden ({{maxFiles}}) is bereikt.',
  'fileUpload.error.maxSize': 'Het bestand overschrijdt de maximale grootte van {{maxSize}} bytes.',
  'fileUpload.error.minSize':
    'Het bestand is kleiner dan de minimale grootte van {{minSize}} bytes.',
  'fileUpload.error.networkError': 'Het uploaden is mislukt vanwege een netwerkfout.',
  'fileUpload.error.noSource': 'Geen bronbestand beschikbaar',
  'fileUpload.error.timedOut': 'Upload is mislukt vanwege een time-out.',
  'fileUpload.error.typeNotAccepted': 'Bestandstype " {{type}} " wordt niet geaccepteerd',
  'fileUpload.error.uploadFailed': 'Uploaden mislukt',
  'fileUpload.error.uploadFailedStatus': 'Uploaden mislukt met status {{status}}',
}
