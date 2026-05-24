import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for af. */
export const af: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Kamera-aansig van strepieskodeskandeerder',
  'barcodeScanner.error.permission_denied': 'Kameratoestemming geweier',
  'barcodeScanner.error.no_camera': 'Geen kamera gevind nie',
  'barcodeScanner.error.unsupported': 'Kamera word nie in hierdie blaaier ondersteun nie',
  'barcodeScanner.error.detector_failure': 'Streepkode-opsporer het misluk',
  'barcodeScanner.error.fallback_unavailable':
    'Streepkodeskandeerderbiblioteek kon nie gelaai word nie',
  'barcodeScanner.status.starting': 'Kamera begin…',
  'barcodeScanner.status.scanning': 'Skandeer tans…',
  'barcodeScanner.status.stopped': 'Skandeer voltooi',
}
