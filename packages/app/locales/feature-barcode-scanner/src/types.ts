/** Translation keys for the feature-barcode-scanner locale package. */
export type BarcodeScannerTranslationKey =
  | 'barcodeScanner.aria.region'
  | 'barcodeScanner.error.permission_denied'
  | 'barcodeScanner.error.no_camera'
  | 'barcodeScanner.error.unsupported'
  | 'barcodeScanner.error.detector_failure'
  | 'barcodeScanner.error.fallback_unavailable'
  | 'barcodeScanner.status.starting'
  | 'barcodeScanner.status.scanning'
  | 'barcodeScanner.status.stopped'

/** Translation record mapping barcode-scanner keys to translated strings. */
export type BarcodeScannerTranslations = Record<BarcodeScannerTranslationKey, string>
