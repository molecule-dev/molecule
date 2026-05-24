import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for be. */
export const be: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Выгляд камеры сканера штрых-кодаў',
  'barcodeScanner.error.permission_denied': 'У доступе да камеры забаронена',
  'barcodeScanner.error.no_camera': 'Камера не знойдзена',
  'barcodeScanner.error.unsupported': 'Камера не падтрымліваецца ў гэтым браўзеры',
  'barcodeScanner.error.detector_failure': 'Памылка дэтэктара штрых-кодаў',
  'barcodeScanner.error.fallback_unavailable':
    'Не ўдалося загрузіць бібліятэку сканера штрых-кодаў',
  'barcodeScanner.status.starting': 'Уключэнне камеры…',
  'barcodeScanner.status.scanning': 'Сканіраванне…',
  'barcodeScanner.status.stopped': 'Сканаванне завершана',
}
