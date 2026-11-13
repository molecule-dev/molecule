import type { AuthTranslations } from './types.js'

/** Auth translations for fil. */
export const fil: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Nabigo ang pag-login',
  'auth.error.requestFailed': 'Nabigo ang kahilingan',
  'auth.error.registrationFailed': 'Nabigo ang pagpaparehistro',
  'auth.error.noRefreshToken': 'Walang magagamit na token ng pag-refresh',
  'auth.error.profileRequiresSignIn': 'Mag-sign in bago mag-update ng profile',
  'auth.error.profileSessionChanged': 'Binago ang sesyon ng profile bago ang pagsusumite',
  'auth.error.passwordRequiresSignIn': 'Mag-sign in bago magpalit ng password',
  'auth.error.passwordSessionChanged': 'Binago ang sesyon ng password bago ang pagsusumite',
}
