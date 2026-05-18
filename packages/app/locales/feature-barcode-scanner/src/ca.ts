import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ca. */
export const ca: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Vista de la càmera de l&#39;escàner de codis de barres',
  'barcodeScanner.error.permission_denied': 'Permís de càmera denegat',
  'barcodeScanner.error.no_camera': 'No s&#39;ha trobat cap càmera',
  'barcodeScanner.error.unsupported': 'Càmera no compatible amb aquest navegador',
  'barcodeScanner.error.detector_failure': 'El detector de codis de barres ha fallat',
  'barcodeScanner.error.fallback_unavailable':
    'No s&#39;ha pogut carregar la biblioteca de l&#39;escàner de codis de barres',
  'barcodeScanner.status.starting': 'Iniciant la càmera…',
  'barcodeScanner.status.scanning': 'Escanejant…',
  'barcodeScanner.status.stopped': 'Escaneig completat',
}
