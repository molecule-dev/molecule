import type { AuthTranslations } from './types.js'

/** Auth translations for nb. */
export const nb: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Innlogging mislyktes',
  'auth.error.requestFailed': 'Forespørselen mislyktes',
  'auth.error.registrationFailed': 'Registreringen mislyktes',
  'auth.error.noRefreshToken': 'Ingen oppdateringstoken tilgjengelig',
  'auth.error.profileRequiresSignIn': 'Logg inn før du oppdaterer en profil',
  'auth.error.profileSessionChanged': 'Profiløkten ble endret før innsending',
  'auth.error.passwordRequiresSignIn': 'Logg inn før du endrer et passord',
  'auth.error.passwordSessionChanged': 'Passordøkten ble endret før innsending',
  'auth.error.requestTimedOut': 'Autentiseringsforespørselen ble tidsavbrutt',
}
