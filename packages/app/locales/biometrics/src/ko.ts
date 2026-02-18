import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Korean. */
export const ko: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn이 지원되지 않습니다',
  'biometrics.error.noPlatformAuth': '플랫폼 인증 장치가 없습니다',
  'biometrics.error.checkFailed': '가용성 확인 중 오류가 발생했습니다',
  'biometrics.error.noCredential': '자격 증명이 반환되지 않았습니다',
  'biometrics.error.userCancel': '사용자가 인증을 취소했습니다',
  'biometrics.error.permissionDenied': '권한이 거부되었습니다',
  'biometrics.error.unknown': '알 수 없는 오류',
  'biometrics.device.fingerprint': '지문 인식',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
