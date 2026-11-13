import type { AuthTranslations } from './types.js'

/** Auth translations for Bosnian. */
export const bs: AuthTranslations = {
  'auth.error.requestFailed': 'Zahtjev neuspješan',
  'auth.error.loginFailed': 'Prijava neuspješna',
  'auth.error.registrationFailed': 'Registracija neuspješna',
  'auth.error.noRefreshToken': 'Nema dostupnog tokena za osvježavanje',
  'auth.error.profileRequiresSignIn': 'Prijavite se prije ažuriranja profila',
  'auth.error.profileSessionChanged': 'Sesija profila je promijenjena prije slanja',
  'auth.error.passwordRequiresSignIn': 'Prijavite se prije promjene lozinke',
  'auth.error.passwordSessionChanged': 'Sesija lozinke je promijenjena prije slanja',
  'auth.error.requestTimedOut': 'Zahtjev za autentifikaciju je istekao',
}
