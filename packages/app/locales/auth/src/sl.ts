import type { AuthTranslations } from './types.js'

/** Auth translations for Slovenian. */
export const sl: AuthTranslations = {
  'auth.error.requestFailed': 'Zahteva ni uspela',
  'auth.error.loginFailed': 'Prijava ni uspela',
  'auth.error.registrationFailed': 'Registracija ni uspela',
  'auth.error.noRefreshToken': 'Ni na voljo žetona za osvežitev',
  'auth.error.profileRequiresSignIn': 'Prijavite se pred posodobitvijo profila',
  'auth.error.profileSessionChanged': 'Seja profila se je spremenila pred oddajo',
  'auth.error.passwordRequiresSignIn': 'Prijava pred spremembo gesla',
  'auth.error.passwordSessionChanged': 'Geslo seje se je spremenilo pred oddajo',
  'auth.error.requestTimedOut': 'Časovna omejitev zahteve za preverjanje pristnosti je potekla',
}
