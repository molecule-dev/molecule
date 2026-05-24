import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ky. */
export const ky: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Штрих-код сканеринин камера көрүнүшү',
  'barcodeScanner.error.permission_denied': 'Камерага уруксат берилген жок',
  'barcodeScanner.error.no_camera': 'Камера табылган жок',
  'barcodeScanner.error.unsupported': 'Бул браузерде камера колдоого алынбайт',
  'barcodeScanner.error.detector_failure': 'Штрих-код детектору иштебей калды',
  'barcodeScanner.error.fallback_unavailable': 'Штрих-код сканеринин китепканасы жүктөлбөй койду',
  'barcodeScanner.status.starting': 'Камераны иштетүү…',
  'barcodeScanner.status.scanning': 'Скандалууда…',
  'barcodeScanner.status.stopped': 'Скандоо аяктады',
}
