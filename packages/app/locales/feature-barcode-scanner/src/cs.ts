import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for cs. */
export const cs: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Pohled z kamery skeneru čárových kódů',
  'barcodeScanner.error.permission_denied': 'Přístup k kameře byl zamítnut',
  'barcodeScanner.error.no_camera': 'Nenalezena žádná kamera',
  'barcodeScanner.error.unsupported': 'Fotoaparát není v tomto prohlížeči podporován',
  'barcodeScanner.error.detector_failure': 'Detektor čárových kódů selhal',
  'barcodeScanner.error.fallback_unavailable': 'Knihovnu skeneru čárových kódů nelze načíst',
  'barcodeScanner.status.starting': 'Spouštění kamery…',
  'barcodeScanner.status.scanning': 'Snímání…',
  'barcodeScanner.status.stopped': 'Skenování dokončeno',
}
