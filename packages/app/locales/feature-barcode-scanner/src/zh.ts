import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for zh. */
export const zh: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': '正在扫描…',
  'barcodeScanner.aria.region': '条形码扫描器摄像头视图',
  'barcodeScanner.error.permission_denied': '相机权限被拒绝',
  'barcodeScanner.error.no_camera': '未找到摄像头',
  'barcodeScanner.error.unsupported': '此浏览器不支持摄像头。',
  'barcodeScanner.error.detector_failure': '条形码检测器故障',
  'barcodeScanner.error.fallback_unavailable': '条形码扫描器库无法加载',
  'barcodeScanner.status.starting': '启动相机……',
  'barcodeScanner.status.stopped': '扫描完成',
}
