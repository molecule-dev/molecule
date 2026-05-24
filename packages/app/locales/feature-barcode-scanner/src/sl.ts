import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sl. */
export const sl: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Pogled kamere skenerja črtne kode',
  'barcodeScanner.error.permission_denied': 'Dovoljenje za kamero zavrnjeno',
  'barcodeScanner.error.no_camera': 'Ni najdene kamere',
  'barcodeScanner.error.unsupported': 'Kamera ni podprta v tem brskalniku',
  'barcodeScanner.error.detector_failure': 'Detektor črtne kode ni uspel',
  'barcodeScanner.error.fallback_unavailable':
    'Knjižnice skenerjev črtnih kod ni bilo mogoče naložiti',
  'barcodeScanner.status.starting': 'Zagon kamere …',
  'barcodeScanner.status.scanning': 'Skeniranje …',
  'barcodeScanner.status.stopped': 'Skeniranje končano',
}
