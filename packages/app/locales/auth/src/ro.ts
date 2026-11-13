import type { AuthTranslations } from './types.js'

/** Auth translations for ro. */
export const ro: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Autentificarea a eșuat',
  'auth.error.requestFailed': 'Solicitarea a eșuat',
  'auth.error.registrationFailed': 'Înregistrarea a eșuat',
  'auth.error.noRefreshToken': 'Nu este disponibil niciun token de actualizare',
  'auth.error.profileRequiresSignIn': 'Conectați-vă înainte de a actualiza un profil',
  'auth.error.profileSessionChanged': 'Sesiunea de profil a fost modificată înainte de trimitere',
  'auth.error.passwordRequiresSignIn': 'Conectați-vă înainte de a schimba o parolă',
  'auth.error.passwordSessionChanged': 'Parola sesiunii a fost modificată înainte de trimitere',
}
