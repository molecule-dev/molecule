import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Japanese. */
export const ja: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthnはサポートされていません',
  'biometrics.error.noPlatformAuth': 'プラットフォーム認証器がありません',
  'biometrics.error.checkFailed': '利用可能性の確認中にエラーが発生しました',
  'biometrics.error.noCredential': '資格情報が返されませんでした',
  'biometrics.error.userCancel': 'ユーザーが認証をキャンセルしました',
  'biometrics.error.permissionDenied': '権限が拒否されました',
  'biometrics.error.unknown': '不明なエラー',
  'biometrics.device.fingerprint': '指紋認証',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
