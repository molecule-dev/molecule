import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for bg. */
export const bg: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Изглед от камерата на скенера за баркодове',
  'barcodeScanner.error.permission_denied': 'Разрешението за камера е отказано',
  'barcodeScanner.error.no_camera': 'Не е намерена камера',
  'barcodeScanner.error.unsupported': 'Камерата не се поддържа в този браузър',
  'barcodeScanner.error.detector_failure': 'Детекторът за баркодове не успя',
  'barcodeScanner.error.fallback_unavailable':
    'Библиотеката на скенера за баркодове не можа да бъде заредена',
  'barcodeScanner.status.starting': 'Стартиране на камерата…',
  'barcodeScanner.status.scanning': 'Сканиране…',
  'barcodeScanner.status.stopped': 'Сканирането е завършено',
}
