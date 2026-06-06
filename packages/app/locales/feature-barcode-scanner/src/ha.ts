import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ha. */
export const ha: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': "Duba kyamarar na'urar daukar hoto ta Barcode",
  'barcodeScanner.error.permission_denied': 'An hana izinin kyamara',
  'barcodeScanner.error.no_camera': 'Ba a sami kyamara ba',
  'barcodeScanner.error.unsupported': 'Ba a tallafawa kyamara a cikin wannan burauzar ba',
  'barcodeScanner.error.detector_failure': "Na'urar gano lambar barcode ta gaza",
  'barcodeScanner.error.fallback_unavailable':
    "Ba za a iya loda ɗakin karatun na'urar daukar hoto ta Barcode ba",
  'barcodeScanner.status.starting': 'Kyamarar farawa…',
  'barcodeScanner.status.scanning': 'Ana dubawa…',
  'barcodeScanner.status.stopped': 'An kammala duba',
}
