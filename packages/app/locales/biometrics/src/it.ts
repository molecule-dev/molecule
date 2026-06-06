import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for it. */
export const it: Partial<BiometricsTranslations> = {
  'biometrics.error.notSupported': 'WebAuthn non supportato',
  'biometrics.error.noPlatformAuth': 'Nessun autenticatore di piattaforma',
  'biometrics.error.checkFailed': 'Errore durante il controllo della disponibilità',
  'biometrics.error.noCredential': 'Nessuna credenziale restituita',
  'biometrics.error.permissionDenied': 'Permesso negato',
  'biometrics.error.unknown': 'Errore sconosciuto',
  'biometrics.device.fingerprint': 'Impronta digitale',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
  'biometrics.error.userCancel': "Autenticazione annullata dall'utente",
}
