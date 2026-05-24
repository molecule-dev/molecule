import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for mk. */
export const mk: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Преглед на камерата со скенер за баркодови',
  'barcodeScanner.error.permission_denied': 'Дозволата за камерата е одбиена',
  'barcodeScanner.error.no_camera': 'Не е пронајдена камера',
  'barcodeScanner.error.unsupported': 'Камерата не е поддржана во овој прелистувач',
  'barcodeScanner.error.detector_failure': 'Детекторот на баркодови не успеа',
  'barcodeScanner.error.fallback_unavailable':
    'Библиотеката со скенер за баркодови не можеше да се вчита',
  'barcodeScanner.status.starting': 'Се стартува камерата…',
  'barcodeScanner.status.scanning': 'Скенирање…',
  'barcodeScanner.status.stopped': 'Скенирањето е завршено',
}
