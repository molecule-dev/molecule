import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for pl. */
export const pl: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Skanowanie…',
  'barcodeScanner.aria.region': 'Widok kamery skanera kodów kreskowych',
  'barcodeScanner.error.permission_denied': 'Odmowa dostępu do kamery',
  'barcodeScanner.error.no_camera': 'Nie znaleziono kamery',
  'barcodeScanner.error.unsupported': 'Aparat nie jest obsługiwany w tej przeglądarce',
  'barcodeScanner.error.detector_failure': 'Detektor kodów kreskowych uległ awarii',
  'barcodeScanner.error.fallback_unavailable':
    'Nie można załadować biblioteki skanera kodów kreskowych',
  'barcodeScanner.status.starting': 'Uruchamianie kamery…',
  'barcodeScanner.status.stopped': 'Skanowanie zakończone',
}
