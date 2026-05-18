import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for pt. */
export const pt: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Escaneando…',
  'barcodeScanner.aria.region': 'Visão da câmera do leitor de código de barras',
  'barcodeScanner.error.permission_denied': 'Permissão para filmagem negada',
  'barcodeScanner.error.no_camera': 'Nenhuma câmera encontrada',
  'barcodeScanner.error.unsupported': 'Câmera não suportada neste navegador',
  'barcodeScanner.error.detector_failure': 'O detector de código de barras falhou',
  'barcodeScanner.error.fallback_unavailable':
    'Não foi possível carregar a biblioteca do leitor de código de barras.',
  'barcodeScanner.status.starting': 'Iniciando a câmera…',
  'barcodeScanner.status.stopped': 'Digitalização concluída',
}
