import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for de. */
export const de: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Wird gescannt…',
  'barcodeScanner.aria.region': 'Kameraansicht des Barcode-Scanners',
  'barcodeScanner.error.permission_denied': 'Kamerazugriff verweigert',
  'barcodeScanner.error.no_camera': 'Keine Kamera gefunden',
  'barcodeScanner.error.unsupported': 'Kamera wird von diesem Browser nicht unterstützt',
  'barcodeScanner.error.detector_failure': 'Barcode-Detektor defekt',
  'barcodeScanner.error.fallback_unavailable':
    'Die Barcode-Scanner-Bibliothek konnte nicht geladen werden.',
  'barcodeScanner.status.starting': 'Kamera startet…',
  'barcodeScanner.status.stopped': 'Scan abgeschlossen',
}
