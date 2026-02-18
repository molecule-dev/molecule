import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for French. */
export const fr: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn non pris en charge',
  'biometrics.error.noPlatformAuth': 'Aucun authentificateur de plateforme',
  'biometrics.error.checkFailed': 'Erreur lors de la vérification de la disponibilité',
  'biometrics.error.noCredential': 'Aucune accréditation retournée',
  'biometrics.error.userCancel': "L'utilisateur a annulé l'authentification",
  'biometrics.error.permissionDenied': 'Permission refusée',
  'biometrics.error.unknown': 'Erreur inconnue',
  'biometrics.device.fingerprint': 'Empreinte digitale',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
