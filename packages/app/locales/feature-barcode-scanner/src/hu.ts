import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for hu. */
export const hu: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Vonalkódolvasó kameranézet',
  'barcodeScanner.error.permission_denied': 'Kameraengedély megtagadva',
  'barcodeScanner.error.no_camera': 'Nem található kamera',
  'barcodeScanner.error.unsupported': 'A kamera nem támogatott ebben a böngészőben',
  'barcodeScanner.error.detector_failure': 'Vonalkód-érzékelő hibás',
  'barcodeScanner.error.fallback_unavailable': 'A vonalkódolvasó könyvtárát nem sikerült betölteni',
  'barcodeScanner.status.starting': 'Kamera indítása…',
  'barcodeScanner.status.scanning': 'Szkennelés…',
  'barcodeScanner.status.stopped': 'Szkennelés befejezve',
}
