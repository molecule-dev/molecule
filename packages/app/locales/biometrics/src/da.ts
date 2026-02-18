import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Danish. */
export const da: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn understøttes ikke',
  'biometrics.error.noPlatformAuth': 'Ingen platform-autentifikator',
  'biometrics.error.checkFailed': 'Fejl ved kontrol af tilgængelighed',
  'biometrics.error.noCredential': 'Ingen legitimationsoplysninger returneret',
  'biometrics.error.userCancel': 'Bruger annullerede godkendelse',
  'biometrics.error.permissionDenied': 'Tilladelse nægtet',
  'biometrics.error.unknown': 'Ukendt fejl',
  'biometrics.device.fingerprint': 'Fingeraftryk',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
