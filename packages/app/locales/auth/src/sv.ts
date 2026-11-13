import type { AuthTranslations } from './types.js'

/** Auth translations for sv. */
export const sv: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Inloggning misslyckades',
  'auth.error.requestFailed': 'Begäran misslyckades',
  'auth.error.registrationFailed': 'Registreringen misslyckades',
  'auth.error.noRefreshToken': 'Ingen uppdateringstoken tillgänglig',
  'auth.error.profileRequiresSignIn': 'Logga in innan du uppdaterar en profil',
  'auth.error.profileSessionChanged': 'Profilsessionen ändrades före inskickning',
  'auth.error.passwordRequiresSignIn': 'Logga in innan du ändrar ett lösenord',
  'auth.error.passwordSessionChanged': 'Lösenordssessionen ändrades före inskickning',
}
