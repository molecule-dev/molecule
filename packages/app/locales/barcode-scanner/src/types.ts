/** Translation keys for the barcode-scanner locale package. */
export type BarcodeScannerTranslationKey =
  | 'barcodeScanner.status.starting'
  | 'barcodeScanner.status.scanning'
  | 'barcodeScanner.status.stopped'

/** Translation record mapping barcode-scanner-react keys to translated strings. */
export type BarcodeScannerTranslations = Record<BarcodeScannerTranslationKey, string>
