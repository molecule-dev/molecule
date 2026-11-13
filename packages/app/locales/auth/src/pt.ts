import type { AuthTranslations } from './types.js'

/** Auth translations for pt. */
export const pt: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Falha no login',
  'auth.error.requestFailed': 'A solicitação falhou',
  'auth.error.registrationFailed': 'Falha no registro',
  'auth.error.noRefreshToken': 'Nenhum token de atualização disponível',
  'auth.error.profileRequiresSignIn': 'Faça login antes de atualizar seu perfil.',
  'auth.error.profileSessionChanged': 'A sessão de perfil foi alterada antes do envio.',
  'auth.error.passwordRequiresSignIn': 'Faça login antes de alterar a senha.',
  'auth.error.passwordSessionChanged': 'A sessão de senha foi alterada antes do envio.',
  'auth.error.requestTimedOut': 'A solicitação de autenticação expirou.',
}
