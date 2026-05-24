import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for uk. */
export const uk: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Вид камери сканера штрих-кодів',
  'barcodeScanner.error.permission_denied': 'Доступ до камери відхилено',
  'barcodeScanner.error.no_camera': 'Камеру не знайдено',
  'barcodeScanner.error.unsupported': 'Камера не підтримується в цьому браузері',
  'barcodeScanner.error.detector_failure': 'Збій детектора штрих-кодів',
  'barcodeScanner.error.fallback_unavailable':
    'Не вдалося завантажити бібліотеку сканера штрих-кодів',
  'barcodeScanner.status.starting': 'Запуск камери…',
  'barcodeScanner.status.scanning': 'Сканування…',
  'barcodeScanner.status.stopped': 'Сканування завершено',
}
