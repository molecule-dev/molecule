import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for nb. */
export const nb: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Kameravisning av strekkodeskanner',
  'barcodeScanner.error.permission_denied': 'Kameratillatelse nektet',
  'barcodeScanner.error.no_camera': 'Ingen kamera funnet',
  'barcodeScanner.error.unsupported': 'Kameraet støttes ikke i denne nettleseren',
  'barcodeScanner.error.detector_failure': 'Strekkodedetektoren mislyktes',
  'barcodeScanner.error.fallback_unavailable': 'Kunne ikke laste inn strekkodeskannerbiblioteket',
  'barcodeScanner.status.starting': 'Starter kameraet …',
  'barcodeScanner.status.scanning': 'Skanner…',
  'barcodeScanner.status.stopped': 'Skanning fullført',
}
