/** Translation keys for the auth locale package. */
export type AuthTranslationKey =
  | 'auth.error.requestFailed'
  | 'auth.error.loginFailed'
  | 'auth.error.registrationFailed'
  | 'auth.error.noRefreshToken'

/** Translation record mapping auth keys to translated strings. */
export type AuthTranslations = Record<AuthTranslationKey, string>
