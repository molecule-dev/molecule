import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ko. */
export const ko: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': '스캔 중…',
  'barcodeScanner.aria.region': '바코드 스캐너 카메라 화면',
  'barcodeScanner.error.permission_denied': '카메라 접근 권한이 거부되었습니다.',
  'barcodeScanner.error.no_camera': '카메라를 찾을 수 없습니다.',
  'barcodeScanner.error.unsupported': '이 브라우저에서는 카메라가 지원되지 않습니다.',
  'barcodeScanner.error.detector_failure': '바코드 감지기 오류',
  'barcodeScanner.error.fallback_unavailable': '바코드 스캐너 라이브러리를 로드할 수 없습니다.',
  'barcodeScanner.status.starting': '카메라 시작 중…',
  'barcodeScanner.status.stopped': '스캔 완료',
}
