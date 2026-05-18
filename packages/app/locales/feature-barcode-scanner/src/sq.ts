import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sq. */
export const sq: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Pamje nga kamera e skanerit të barkodit',
  'barcodeScanner.error.permission_denied': 'Leja e kamerës u refuzua',
  'barcodeScanner.error.no_camera': 'Nuk u gjet asnjë kamera',
  'barcodeScanner.error.unsupported': 'Kamera nuk mbështetet në këtë shfletues',
  'barcodeScanner.error.detector_failure': 'Detektori i barkodit dështoi.',
  'barcodeScanner.error.fallback_unavailable':
    'Biblioteka e skanerit të barkodeve nuk mund të ngarkohej',
  'barcodeScanner.status.starting': 'Duke nisur kamerën…',
  'barcodeScanner.status.scanning': 'Duke skanuar…',
  'barcodeScanner.status.stopped': 'Skanimi përfundoi',
}
