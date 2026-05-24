import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sv. */
export const sv: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Skannar…',
  'barcodeScanner.aria.region': 'Streckkodsläsarens kameravy',
  'barcodeScanner.error.permission_denied': 'Kameratillstånd nekad',
  'barcodeScanner.error.no_camera': 'Ingen kamera hittades',
  'barcodeScanner.error.unsupported': 'Kameran stöds inte i den här webbläsaren',
  'barcodeScanner.error.detector_failure': 'Streckkodsdetektorn misslyckades',
  'barcodeScanner.error.fallback_unavailable': 'Streckkodsläsarbiblioteket kunde inte laddas',
  'barcodeScanner.status.starting': 'Startar kameran…',
  'barcodeScanner.status.stopped': 'Skanning klar',
}
