import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Czech. */
export const cs: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn není podporován',
  'biometrics.error.noPlatformAuth': 'Žádný platformový autentizátor',
  'biometrics.error.checkFailed': 'Chyba při kontrole dostupnosti',
  'biometrics.error.noCredential': 'Nebyly vráceny přihlašovací údaje',
  'biometrics.error.userCancel': 'Uživatel zrušil ověření',
  'biometrics.error.permissionDenied': 'Oprávnění zamítnuto',
  'biometrics.error.unknown': 'Neznámá chyba',
  'biometrics.device.fingerprint': 'Otisk prstu',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
