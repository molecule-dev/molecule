import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for vi. */
export const vi: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Đang quét…',
  'barcodeScanner.aria.region': 'chế độ xem camera máy quét mã vạch',
  'barcodeScanner.error.permission_denied': 'Quyền truy cập camera bị từ chối',
  'barcodeScanner.error.no_camera': 'Không tìm thấy camera',
  'barcodeScanner.error.unsupported': 'Trình duyệt này không hỗ trợ camera.',
  'barcodeScanner.error.detector_failure': 'Máy dò mã vạch bị lỗi',
  'barcodeScanner.error.fallback_unavailable': 'Không thể tải thư viện máy quét mã vạch.',
  'barcodeScanner.status.starting': 'Bắt đầu quay phim…',
  'barcodeScanner.status.stopped': 'Quá trình quét hoàn tất',
}
