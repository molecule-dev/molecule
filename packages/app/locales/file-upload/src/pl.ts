import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for pl. */
export const pl: FileUploadTranslations = {
  'fileUpload.error.cancelled': 'Przesyłanie anulowane',
  'fileUpload.error.extensionNotAccepted':
    'Rozszerzenie pliku „ {{extension}} ” nie jest akceptowane',
  'fileUpload.error.maxFiles': 'Osiągnięto maksymalną liczbę plików ({{maxFiles}})',
  'fileUpload.error.maxSize': 'Plik przekracza maksymalny rozmiar {{maxSize}} bajtów',
  'fileUpload.error.minSize': 'Plik ma rozmiar mniejszy niż minimalny rozmiar {{minSize}} bajtów',
  'fileUpload.error.networkError': 'Przesyłanie nie powiodło się z powodu błędu sieciowego',
  'fileUpload.error.noSource': 'Brak pliku źródłowego',
  'fileUpload.error.timedOut': 'Przekroczono limit czasu przesyłania',
  'fileUpload.error.typeNotAccepted': 'Typ pliku „ {{type}} ” nie jest akceptowany',
  'fileUpload.error.uploadFailed': 'Przesyłanie nie powiodło się',
  'fileUpload.error.uploadFailedStatus': 'Nie udało się przesłać. Status: {{status}}',
}
