import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for es. */
export const es: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Escaneando…',
  'barcodeScanner.aria.region': 'Vista de la cámara del escáner de código de barras',
  'barcodeScanner.error.permission_denied': 'Se deniega el permiso para usar la cámara.',
  'barcodeScanner.error.no_camera': 'No se encontró ninguna cámara.',
  'barcodeScanner.error.unsupported': 'La cámara no es compatible con este navegador.',
  'barcodeScanner.error.detector_failure': 'El detector de códigos de barras falló.',
  'barcodeScanner.error.fallback_unavailable':
    'No se pudo cargar la biblioteca del escáner de códigos de barras.',
  'barcodeScanner.status.starting': 'Iniciando la cámara…',
  'barcodeScanner.status.stopped': 'Escaneo completado',
}
