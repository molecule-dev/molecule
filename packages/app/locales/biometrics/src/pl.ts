import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Polish. */
export const pl: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn nie jest obsługiwany',
  'biometrics.error.noPlatformAuth': 'Brak autentyfikatora platformowego',
  'biometrics.error.checkFailed': 'Błąd sprawdzania dostępności',
  'biometrics.error.noCredential': 'Nie zwrócono poświadczeń',
  'biometrics.error.userCancel': 'Użytkownik anulował uwierzytelnianie',
  'biometrics.error.permissionDenied': 'Odmowa uprawnień',
  'biometrics.error.unknown': 'Nieznany błąd',
  'biometrics.device.fingerprint': 'Odcisk palca',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
