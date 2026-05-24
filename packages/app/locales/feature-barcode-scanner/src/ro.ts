import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ro. */
export const ro: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Vizualizare cameră scaner coduri de bare',
  'barcodeScanner.error.permission_denied': 'Permisiunea camerei a fost refuzată',
  'barcodeScanner.error.no_camera': 'Nu a fost găsită nicio cameră',
  'barcodeScanner.error.unsupported': 'Camera nu este compatibilă cu acest browser',
  'barcodeScanner.error.detector_failure': 'Detectorul de coduri de bare a eșuat',
  'barcodeScanner.error.fallback_unavailable':
    'Biblioteca scanerelor de coduri de bare nu a putut fi încărcată',
  'barcodeScanner.status.starting': 'Se pornește camera…',
  'barcodeScanner.status.scanning': 'Scanare…',
  'barcodeScanner.status.stopped': 'Scanare finalizată',
}
