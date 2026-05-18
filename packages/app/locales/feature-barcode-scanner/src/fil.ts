import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for fil. */
export const fil: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'View ng kamera ng barcode scanner',
  'barcodeScanner.error.permission_denied': 'Tinanggihan ang pahintulot sa kamera',
  'barcodeScanner.error.no_camera': 'Walang nakitang kamera',
  'barcodeScanner.error.unsupported': 'Hindi sinusuportahan ang kamera sa browser na ito',
  'barcodeScanner.error.detector_failure': 'Nabigo ang detektor ng barcode',
  'barcodeScanner.error.fallback_unavailable': 'Hindi ma-load ang library ng barcode scanner',
  'barcodeScanner.status.starting': 'Sinisimulan ang kamera…',
  'barcodeScanner.status.scanning': 'Ini-scan…',
  'barcodeScanner.status.stopped': 'Nakumpleto na ang pag-scan',
}
