import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Bulgarian. */
export const bg: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn не се поддържа',
  'biometrics.error.noPlatformAuth': 'Няма платформен удостоверител',
  'biometrics.error.checkFailed': 'Грешка при проверка на наличността',
  'biometrics.error.noCredential': 'Не са върнати удостоверения',
  'biometrics.error.userCancel': 'Потребителят отмени удостоверяването',
  'biometrics.error.permissionDenied': 'Разрешението е отказано',
  'biometrics.error.unknown': 'Неизвестна грешка',
  'biometrics.device.fingerprint': 'Пръстов отпечатък',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
