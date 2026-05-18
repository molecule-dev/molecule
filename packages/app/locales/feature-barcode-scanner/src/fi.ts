import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for fi. */
export const fi: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Viivakoodiskannerin kameranäkymä',
  'barcodeScanner.error.permission_denied': 'Kameran käyttöoikeus evätty',
  'barcodeScanner.error.no_camera': 'Kameraa ei löytynyt',
  'barcodeScanner.error.unsupported': 'Kameraa ei tueta tässä selaimessa',
  'barcodeScanner.error.detector_failure': 'Viivakoodin tunnistus epäonnistui',
  'barcodeScanner.error.fallback_unavailable': 'Viivakoodiskannerikirjastoa ei voitu ladata',
  'barcodeScanner.status.starting': 'Kameran käynnistäminen…',
  'barcodeScanner.status.scanning': 'Skannataan…',
  'barcodeScanner.status.stopped': 'Skannaus valmis',
}
