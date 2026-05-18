import type { BarcodeScannerTranslations } from './types.js'

/** Barcode-scanner translations for English. */
export const en: BarcodeScannerTranslations = {
  'barcodeScanner.aria.region': 'Barcode scanner camera view',
  'barcodeScanner.error.permission_denied': 'Camera permission denied',
  'barcodeScanner.error.no_camera': 'No camera found',
  'barcodeScanner.error.unsupported': 'Camera not supported in this browser',
  'barcodeScanner.error.detector_failure': 'Barcode detector failed',
  'barcodeScanner.error.fallback_unavailable': 'Barcode scanner library could not be loaded',
  'barcodeScanner.status.starting': 'Starting camera…',
  'barcodeScanner.status.scanning': 'Scanning…',
  'barcodeScanner.status.stopped': 'Scan complete',
}
