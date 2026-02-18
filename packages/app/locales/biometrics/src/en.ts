import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for English. */
export const en: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn not supported',
  'biometrics.error.noPlatformAuth': 'No platform authenticator',
  'biometrics.error.checkFailed': 'Error checking availability',
  'biometrics.error.noCredential': 'No credential returned',
  'biometrics.error.userCancel': 'User cancelled authentication',
  'biometrics.error.permissionDenied': 'Permission denied',
  'biometrics.error.unknown': 'Unknown error',
  'biometrics.device.fingerprint': 'Fingerprint',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
