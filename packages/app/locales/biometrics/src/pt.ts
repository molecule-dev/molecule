import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Portuguese. */
export const pt: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn não suportado',
  'biometrics.error.noPlatformAuth': 'Sem autenticador de plataforma',
  'biometrics.error.checkFailed': 'Erro ao verificar a disponibilidade',
  'biometrics.error.noCredential': 'Nenhuma credencial retornada',
  'biometrics.error.userCancel': 'O utilizador cancelou a autenticação',
  'biometrics.error.permissionDenied': 'Permissão negada',
  'biometrics.error.unknown': 'Erro desconhecido',
  'biometrics.device.fingerprint': 'Impressão digital',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
