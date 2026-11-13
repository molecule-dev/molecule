import type { AuthTranslations } from './types.js'

/** Auth translations for hu. */
export const hu: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Bejelentkezés sikertelen',
  'auth.error.requestFailed': 'A kérés sikertelen',
  'auth.error.registrationFailed': 'Regisztráció sikertelen',
  'auth.error.noRefreshToken': 'Nincs elérhető frissítési token',
  'auth.error.profileRequiresSignIn': 'Bejelentkezés profil frissítése előtt',
  'auth.error.profileSessionChanged': 'A profil munkamenete megváltozott a beküldés előtt',
  'auth.error.passwordRequiresSignIn': 'Jelentkezzen be jelszó módosítása előtt',
  'auth.error.passwordSessionChanged': 'A jelszó munkamenete megváltozott a beküldés előtt',
}
