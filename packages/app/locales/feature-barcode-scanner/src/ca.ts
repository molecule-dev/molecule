import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ca. */
export const ca: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': "Vista de la càmera de l'escàner de codis de barres",
  'barcodeScanner.error.permission_denied': 'Permís de càmera denegat',
  'barcodeScanner.error.no_camera': "No s'ha trobat cap càmera",
  'barcodeScanner.error.unsupported': 'Càmera no compatible amb aquest navegador',
  'barcodeScanner.error.detector_failure': 'El detector de codis de barres ha fallat',
  'barcodeScanner.error.fallback_unavailable':
    "No s'ha pogut carregar la biblioteca de l'escàner de codis de barres",
  'barcodeScanner.status.starting': 'Iniciant la càmera…',
  'barcodeScanner.status.scanning': 'Escanejant…',
  'barcodeScanner.status.stopped': 'Escaneig completat',
}
