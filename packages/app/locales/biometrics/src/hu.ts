import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Hungarian. */
export const hu: BiometricsTranslations = {
  'biometrics.error.notSupported': 'A WebAuthn nem támogatott',
  'biometrics.error.noPlatformAuth': 'Nincs platform hitelesítő',
  'biometrics.error.checkFailed': 'Hiba az elérhetőség ellenőrzésekor',
  'biometrics.error.noCredential': 'Nem érkezett hitelesítő adat',
  'biometrics.error.userCancel': 'A felhasználó megszakította a hitelesítést',
  'biometrics.error.permissionDenied': 'Engedély megtagadva',
  'biometrics.error.unknown': 'Ismeretlen hiba',
  'biometrics.device.fingerprint': 'Ujjlenyomat',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
