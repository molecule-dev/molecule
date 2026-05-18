import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for it. */
export const it: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Scansione…',
  'barcodeScanner.aria.region': 'Visuale della telecamera dello scanner di codici a barre',
  'barcodeScanner.error.permission_denied': 'Autorizzazione alla fotocamera negata',
  'barcodeScanner.error.no_camera': 'Nessuna telecamera trovata',
  'barcodeScanner.error.unsupported': 'La fotocamera non è supportata in questo browser.',
  'barcodeScanner.error.detector_failure': 'Il rilevatore di codici a barre non ha funzionato',
  'barcodeScanner.error.fallback_unavailable':
    'Impossibile caricare la libreria dello scanner di codici a barre.',
  'barcodeScanner.status.starting': 'Avvio della telecamera…',
  'barcodeScanner.status.stopped': 'Scansione completata',
}
