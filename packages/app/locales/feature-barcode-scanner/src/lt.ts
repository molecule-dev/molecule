import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for lt. */
export const lt: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Brūkšninių kodų skaitytuvo kameros vaizdas',
  'barcodeScanner.error.permission_denied': 'Kameros leidimas atmestas',
  'barcodeScanner.error.no_camera': 'Nerasta jokių kamerų',
  'barcodeScanner.error.unsupported': 'Ši naršyklė nepalaiko kameros',
  'barcodeScanner.error.detector_failure': 'Brūkšninio kodo detektorius nepavyko',
  'barcodeScanner.error.fallback_unavailable':
    'Nepavyko įkelti brūkšninių kodų skaitytuvo bibliotekos',
  'barcodeScanner.status.starting': 'Paleidžiama kamera…',
  'barcodeScanner.status.scanning': 'Skenuojama…',
  'barcodeScanner.status.stopped': 'Nuskaitymas baigtas',
}
