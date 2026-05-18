import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ja. */
export const ja: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'スキャン中…',
  'barcodeScanner.aria.region': 'バーコードスキャナーのカメラビュー',
  'barcodeScanner.error.permission_denied': 'カメラの撮影許可が拒否されました',
  'barcodeScanner.error.no_camera': 'カメラが見つかりません',
  'barcodeScanner.error.unsupported': 'このブラウザではカメラはサポートされていません',
  'barcodeScanner.error.detector_failure': 'バーコード検出器が故障しました',
  'barcodeScanner.error.fallback_unavailable':
    'バーコードスキャナーライブラリをロードできませんでした',
  'barcodeScanner.status.starting': 'カメラを起動します…',
  'barcodeScanner.status.stopped': 'スキャン完了',
}
