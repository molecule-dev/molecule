import type { AuthTranslations } from './types.js'

/** Auth translations for Croatian. */
export const hr: AuthTranslations = {
  'auth.error.requestFailed': 'Zahtjev nije uspio',
  'auth.error.loginFailed': 'Prijava nije uspjela',
  'auth.error.registrationFailed': 'Registracija nije uspjela',
  'auth.error.noRefreshToken': 'Nema dostupnog tokena za osvježavanje',
  'auth.error.profileRequiresSignIn': 'Prijavite se prije ažuriranja profila',
  'auth.error.profileSessionChanged': 'Sesija profila promijenjena je prije slanja',
  'auth.error.passwordRequiresSignIn': 'Prijavite se prije promjene lozinke',
  'auth.error.passwordSessionChanged': 'Sesija lozinke promijenjena je prije slanja',
  'auth.error.requestTimedOut': 'Zahtjev za autentifikaciju je istekao',
}
