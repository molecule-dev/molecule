import type { AuthTranslations } from './types.js'

/** Auth translations for da. */
export const da: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Login mislykkedes',
  'auth.error.requestFailed': 'Anmodningen mislykkedes',
  'auth.error.registrationFailed': 'Registreringen mislykkedes',
  'auth.error.noRefreshToken': 'Ingen opdateringstoken tilgængelig',
  'auth.error.profileRequiresSignIn': 'Log ind før du opdaterer en profil',
  'auth.error.profileSessionChanged': 'Profilsessionen blev ændret før indsendelse',
  'auth.error.passwordRequiresSignIn': 'Log ind, før du ændrer en adgangskode',
  'auth.error.passwordSessionChanged': 'Adgangskodesessionen blev ændret før indsendelse',
}
