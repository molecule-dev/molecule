import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for hr. */
export const hr: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Pogled kamere skenera barkodova',
  'barcodeScanner.error.permission_denied': 'Dozvola za kameru odbijena',
  'barcodeScanner.error.no_camera': 'Nije pronađena kamera',
  'barcodeScanner.error.unsupported': 'Kamera nije podržana u ovom pregledniku',
  'barcodeScanner.error.detector_failure': 'Detektor barkoda nije uspio',
  'barcodeScanner.error.fallback_unavailable': 'Biblioteka skenera barkodova nije se mogla učitati',
  'barcodeScanner.status.starting': 'Pokretanje kamere…',
  'barcodeScanner.status.scanning': 'Skeniranje…',
  'barcodeScanner.status.stopped': 'Skeniranje dovršeno',
}
