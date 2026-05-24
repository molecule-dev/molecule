import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for mt. */
export const mt: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Veduta tal-kamera tal-iskaner tal-barcode',
  'barcodeScanner.error.permission_denied': 'Permess tal-kamera miċħud',
  'barcodeScanner.error.no_camera': 'Ma nstabet l-ebda kamera',
  'barcodeScanner.error.unsupported': 'Kamera mhux appoġġjata f&#39;dan il-brawżer',
  'barcodeScanner.error.detector_failure': 'Id-ditekter tal-barcode falla',
  'barcodeScanner.error.fallback_unavailable':
    'Il-librerija tal-iskaner tal-barcode ma setgħetx tiġi mgħobbija',
  'barcodeScanner.status.starting': 'Qed tibda l-kamera…',
  'barcodeScanner.status.scanning': 'Skennjar…',
  'barcodeScanner.status.stopped': 'Skennjar komplut',
}
