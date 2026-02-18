import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Vietnamese. */
export const vi: BiometricsTranslations = {
  'biometrics.error.notSupported': 'Không hỗ trợ WebAuthn',
  'biometrics.error.noPlatformAuth': 'Không có platform authenticator',
  'biometrics.error.checkFailed': 'Lỗi khi kiểm tra khả dụng',
  'biometrics.error.noCredential': 'Không có credential được trả về',
  'biometrics.error.userCancel': 'Người dùng đã hủy xác thực',
  'biometrics.error.permissionDenied': 'Quyền bị từ chối',
  'biometrics.error.unknown': 'Lỗi không xác định',
  'biometrics.device.fingerprint': 'Vân tay',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
