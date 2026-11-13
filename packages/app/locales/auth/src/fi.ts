import type { AuthTranslations } from './types.js'

/** Auth translations for fi. */
export const fi: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Kirjautuminen epäonnistui',
  'auth.error.requestFailed': 'Pyyntö epäonnistui',
  'auth.error.registrationFailed': 'Rekisteröinti epäonnistui',
  'auth.error.noRefreshToken': 'Päivitystunnusta ei ole saatavilla',
  'auth.error.profileRequiresSignIn': 'Kirjaudu sisään ennen profiilin päivittämistä',
  'auth.error.profileSessionChanged': 'Profiiliistunto muuttui ennen lähettämistä',
  'auth.error.passwordRequiresSignIn': 'Kirjaudu sisään ennen salasanan vaihtamista',
  'auth.error.passwordSessionChanged': 'Salasanaistunto vaihdettu ennen lähettämistä',
  'auth.error.requestTimedOut': 'Todennuspyyntö aikakatkaistiin',
}
