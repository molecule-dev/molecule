import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Croatian. */
export const hr: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn nije podržan',
  'biometrics.error.noPlatformAuth': 'Nema platformskog autentifikatora',
  'biometrics.error.checkFailed': 'Pogreška pri provjeri dostupnosti',
  'biometrics.error.noCredential': 'Vjerodajnice nisu vraćene',
  'biometrics.error.userCancel': 'Korisnik je otkazao autentifikaciju',
  'biometrics.error.permissionDenied': 'Dozvola odbijena',
  'biometrics.error.unknown': 'Nepoznata pogreška',
  'biometrics.device.fingerprint': 'Otisak prsta',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
