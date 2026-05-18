import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for sw. */
export const sw: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Mwonekano wa kamera ya kichanganuzi cha msimbopau',
  'barcodeScanner.error.permission_denied': 'Ruhusa ya kamera imekataliwa',
  'barcodeScanner.error.no_camera': 'Hakuna kamera iliyopatikana',
  'barcodeScanner.error.unsupported': 'Kamera haitumiki katika kivinjari hiki',
  'barcodeScanner.error.detector_failure': 'Kigunduzi cha msimbopau kimeshindwa',
  'barcodeScanner.error.fallback_unavailable':
    'Maktaba ya kichanganuzi cha msimbopau haikuweza kupakiwa',
  'barcodeScanner.status.starting': 'Inaanzisha kamera…',
  'barcodeScanner.status.scanning': 'Inachanganua…',
  'barcodeScanner.status.stopped': 'Uchanganuzi umekamilika',
}
