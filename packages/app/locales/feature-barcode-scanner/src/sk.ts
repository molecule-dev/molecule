import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sk. */
export const sk: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Pohľad kamery skenera čiarových kódov',
  'barcodeScanner.error.permission_denied': 'Prístup k kamere bol zamietnutý',
  'barcodeScanner.error.no_camera': 'Nenašla sa žiadna kamera',
  'barcodeScanner.error.unsupported': 'Fotoaparát nie je v tomto prehliadači podporovaný',
  'barcodeScanner.error.detector_failure': 'Detektor čiarových kódov zlyhal',
  'barcodeScanner.error.fallback_unavailable':
    'Knižnicu skenera čiarových kódov sa nepodarilo načítať',
  'barcodeScanner.status.starting': 'Spúšťanie kamery…',
  'barcodeScanner.status.scanning': 'Skenovanie…',
  'barcodeScanner.status.stopped': 'Skenovanie dokončené',
}
