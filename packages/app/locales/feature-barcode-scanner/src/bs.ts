import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for bs. */
export const bs: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Prikaz kamere skenera barkodova',
  'barcodeScanner.error.permission_denied': 'Dozvola za kameru je odbijena',
  'barcodeScanner.error.no_camera': 'Nije pronađena kamera',
  'barcodeScanner.error.unsupported': 'Kamera nije podržana u ovom pregledniku',
  'barcodeScanner.error.detector_failure': 'Detektor barkoda nije uspio',
  'barcodeScanner.error.fallback_unavailable':
    'Biblioteka skenera barkodova nije mogla biti učitana',
  'barcodeScanner.status.starting': 'Pokretanje kamere…',
  'barcodeScanner.status.scanning': 'Skeniranje…',
  'barcodeScanner.status.stopped': 'Skeniranje završeno',
}
