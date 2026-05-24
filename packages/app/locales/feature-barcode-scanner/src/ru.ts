import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ru. */
export const ru: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Вид с камеры сканера штрих-кодов',
  'barcodeScanner.error.permission_denied': 'Разрешение на использование камеры запрещено.',
  'barcodeScanner.error.no_camera': 'Камера не обнаружена',
  'barcodeScanner.error.unsupported': 'Камера не поддерживается в этом браузере',
  'barcodeScanner.error.detector_failure': 'Детектор штрихкодов не сработал',
  'barcodeScanner.error.fallback_unavailable':
    'Не удалось загрузить библиотеку сканера штрих-кодов.',
  'barcodeScanner.status.starting': 'Запуск камеры…',
  'barcodeScanner.status.scanning': 'Сканирование…',
  'barcodeScanner.status.stopped': 'Сканирование завершено',
}
