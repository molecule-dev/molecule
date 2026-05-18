import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sr. */
export const sr: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Поглед камере скенера баркодова',
  'barcodeScanner.error.permission_denied': 'Дозвола за камеру је одбијена',
  'barcodeScanner.error.no_camera': 'Није пронађена камера',
  'barcodeScanner.error.unsupported': 'Камера није подржана у овом прегледачу',
  'barcodeScanner.error.detector_failure': 'Детектор баркодова није успео',
  'barcodeScanner.error.fallback_unavailable':
    'Библиотека скенера баркодова није могла да се учита',
  'barcodeScanner.status.starting': 'Покретање камере…',
  'barcodeScanner.status.scanning': 'Скенирање…',
  'barcodeScanner.status.stopped': 'Скенирање завршено',
}
