import type { AuthTranslations } from './types.js'

/** Auth translations for mt. */
export const mt: Partial<AuthTranslations> = {
  'auth.error.requestFailed': 'It-talba falliet',
  'auth.error.loginFailed': 'Id-dhul falla',
  'auth.error.registrationFailed': 'Ir-registrazzjoni falliet',
  'auth.error.noRefreshToken': "L-ebda token ta' aġġornament disponibbli",
  'auth.error.profileRequiresSignIn': 'Idħol qabel ma taġġorna profil',
  'auth.error.profileSessionChanged': 'Is-sessjoni tal-profil inbidlet qabel is-sottomissjoni',
  'auth.error.passwordRequiresSignIn': 'Idħol qabel ma tibdel il-password',
  'auth.error.passwordSessionChanged': 'Il-password tas-sessjoni nbidlet qabel is-sottomissjoni',
  'auth.error.requestTimedOut': 'It-talba għall-awtentikazzjoni skadiet',
}
