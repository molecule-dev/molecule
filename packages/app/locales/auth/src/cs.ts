import type { AuthTranslations } from './types.js'

/** Auth translations for cs. */
export const cs: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Přihlášení se nezdařilo',
  'auth.error.requestFailed': 'Žádost se nezdařila',
  'auth.error.registrationFailed': 'Registrace se nezdařila',
  'auth.error.noRefreshToken': 'Není k dispozici žádný token pro obnovení',
  'auth.error.profileRequiresSignIn': 'Přihlášení před aktualizací profilu',
  'auth.error.profileSessionChanged': 'Profilová relace se před odesláním změnila.',
  'auth.error.passwordRequiresSignIn': 'Přihlášení před změnou hesla',
  'auth.error.passwordSessionChanged': 'Heslo relace se před odesláním změnilo.',
}
