import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Russian. */
export const ru: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn не поддерживается',
  'biometrics.error.noPlatformAuth': 'Нет платформенного аутентификатора',
  'biometrics.error.checkFailed': 'Ошибка проверки доступности',
  'biometrics.error.noCredential': 'Учётные данные не возвращены',
  'biometrics.error.userCancel': 'Пользователь отменил аутентификацию',
  'biometrics.error.permissionDenied': 'Разрешение отклонено',
  'biometrics.error.unknown': 'Неизвестная ошибка',
  'biometrics.device.fingerprint': 'Отпечаток пальца',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
