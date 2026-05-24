import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for eu. */
export const eu: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Barra-kode eskanerra kameraren ikuspegia',
  'barcodeScanner.error.permission_denied': 'Kameraren baimena ukatuta',
  'barcodeScanner.error.no_camera': 'Ez da kamerarik aurkitu',
  'barcodeScanner.error.unsupported': 'Kamera ez da onartzen arakatzaile honetan',
  'barcodeScanner.error.detector_failure': 'Barra-kode detektagailuak huts egin du',
  'barcodeScanner.error.fallback_unavailable':
    'Ezin izan da barra-kode eskanerren liburutegia kargatu',
  'barcodeScanner.status.starting': 'Kamera abiarazten…',
  'barcodeScanner.status.scanning': 'Eskaneatzen…',
  'barcodeScanner.status.stopped': 'Eskaneatzea osatu da',
}
