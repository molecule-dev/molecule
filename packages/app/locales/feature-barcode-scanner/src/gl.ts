import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for gl. */
export const gl: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Vista da cámara do escáner de códigos de barras',
  'barcodeScanner.error.permission_denied': 'Permiso da cámara denegado',
  'barcodeScanner.error.no_camera': 'Non se atopou ningunha cámara',
  'barcodeScanner.error.unsupported': 'Cámara non compatible con este navegador',
  'barcodeScanner.error.detector_failure': 'Fallou o detector de código de barras',
  'barcodeScanner.error.fallback_unavailable':
    'Non se puido cargar a biblioteca do escáner de códigos de barras',
  'barcodeScanner.status.starting': 'Iniciando a cámara…',
  'barcodeScanner.status.scanning': 'Escaneando…',
  'barcodeScanner.status.stopped': 'Escaneado completo',
}
