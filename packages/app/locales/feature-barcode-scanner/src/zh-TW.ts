import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for zh-TW. */
export const zhTW: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': '條碼掃描器攝影機視圖',
  'barcodeScanner.error.permission_denied': '相機權限被拒絕',
  'barcodeScanner.error.no_camera': '未找到攝影機',
  'barcodeScanner.error.unsupported': '此瀏覽器不支援攝影機。',
  'barcodeScanner.error.detector_failure': '條碼檢測器故障',
  'barcodeScanner.error.fallback_unavailable': '條碼掃描器庫無法載入',
  'barcodeScanner.status.starting': '啟動相機…',
  'barcodeScanner.status.scanning': '掃描…',
  'barcodeScanner.status.stopped': '掃描完成',
}
