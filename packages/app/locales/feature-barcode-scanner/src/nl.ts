import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for nl. */
export const nl: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Bezig met scannen…',
  'barcodeScanner.aria.region': 'Camerabeeld van de barcodescanner',
  'barcodeScanner.error.permission_denied': 'Cameratoegang geweigerd',
  'barcodeScanner.error.no_camera': 'Geen camera gevonden',
  'barcodeScanner.error.unsupported': 'De camera wordt niet ondersteund in deze browser.',
  'barcodeScanner.error.detector_failure': 'De barcodedetector is mislukt.',
  'barcodeScanner.error.fallback_unavailable':
    'De bibliotheek voor barcodescanners kon niet worden geladen.',
  'barcodeScanner.status.starting': 'Camera starten…',
  'barcodeScanner.status.stopped': 'Scan voltooid',
}
