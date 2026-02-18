import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Swedish. */
export const sv: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn stöds inte',
  'biometrics.error.noPlatformAuth': 'Ingen plattformsautentisering',
  'biometrics.error.checkFailed': 'Fel vid kontroll av tillgänglighet',
  'biometrics.error.noCredential': 'Inga autentiseringsuppgifter returnerade',
  'biometrics.error.userCancel': 'Användaren avbröt autentisering',
  'biometrics.error.permissionDenied': 'Behörighet nekad',
  'biometrics.error.unknown': 'Okänt fel',
  'biometrics.device.fingerprint': 'Fingeravtryck',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
