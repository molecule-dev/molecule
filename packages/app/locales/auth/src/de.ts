import type { AuthTranslations } from './types.js'

/** Auth translations for de. */
export const de: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Anmeldung fehlgeschlagen',
  'auth.error.requestFailed': 'Anfrage fehlgeschlagen',
  'auth.error.registrationFailed': 'Registrierung fehlgeschlagen',
  'auth.error.noRefreshToken': 'Kein Aktualisierungstoken verfügbar',
  'auth.error.profileRequiresSignIn': 'Melden Sie sich an, bevor Sie Ihr Profil aktualisieren.',
  'auth.error.profileSessionChanged': 'Die Profilsitzung wurde vor dem Absenden geändert.',
  'auth.error.passwordRequiresSignIn': 'Melden Sie sich an, bevor Sie Ihr Passwort ändern.',
  'auth.error.passwordSessionChanged': 'Das Sitzungspasswort wurde vor dem Absenden geändert.',
  'auth.error.requestTimedOut': 'Die Authentifizierungsanfrage ist abgelaufen',
}
