import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Finnish. */
export const fi: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn ei ole tuettu',
  'biometrics.error.noPlatformAuth': 'Alustan todentajaa ei löydy',
  'biometrics.error.checkFailed': 'Virhe saatavuuden tarkistuksessa',
  'biometrics.error.noCredential': 'Tunnistetietoa ei palautettu',
  'biometrics.error.userCancel': 'Käyttäjä peruutti todennuksen',
  'biometrics.error.permissionDenied': 'Käyttöoikeus evätty',
  'biometrics.error.unknown': 'Tuntematon virhe',
  'biometrics.device.fingerprint': 'Sormenjälki',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
