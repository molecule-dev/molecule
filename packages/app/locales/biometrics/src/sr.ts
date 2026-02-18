import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Serbian. */
export const sr: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn није подржан',
  'biometrics.error.noPlatformAuth': 'Нема платформског аутентификатора',
  'biometrics.error.checkFailed': 'Грешка при провери доступности',
  'biometrics.error.noCredential': 'Акредитиви нису враћени',
  'biometrics.error.userCancel': 'Корисник је отказао аутентификацију',
  'biometrics.error.permissionDenied': 'Дозвола одбијена',
  'biometrics.error.unknown': 'Непозната грешка',
  'biometrics.device.fingerprint': 'Отисак прста',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
