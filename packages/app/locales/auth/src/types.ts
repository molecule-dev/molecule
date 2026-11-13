/** Translation keys for the auth locale package. */
export type AuthTranslationKey =
  | 'auth.error.requestFailed'
  | 'auth.error.requestTimedOut'
  | 'auth.error.loginFailed'
  | 'auth.error.registrationFailed'
  | 'auth.error.noRefreshToken'
  | 'auth.error.profileRequiresSignIn'
  | 'auth.error.profileSessionChanged'
  | 'auth.error.passwordRequiresSignIn'
  | 'auth.error.passwordSessionChanged'

/** Translation record mapping auth keys to translated strings. */
export type AuthTranslations = Record<AuthTranslationKey, string>
