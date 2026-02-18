import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Ukrainian. */
export const uk: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn не підтримується',
  'biometrics.error.noPlatformAuth': 'Немає платформного автентифікатора',
  'biometrics.error.checkFailed': 'Помилка перевірки доступності',
  'biometrics.error.noCredential': 'Облікові дані не повернуто',
  'biometrics.error.userCancel': 'Користувач скасував автентифікацію',
  'biometrics.error.permissionDenied': 'Дозвіл відхилено',
  'biometrics.error.unknown': 'Невідома помилка',
  'biometrics.device.fingerprint': 'Відбиток пальця',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
