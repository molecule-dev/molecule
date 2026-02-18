/** Translation keys for the secrets-doppler locale package. */
export type SecretsDopplerTranslationKey =
  | 'secrets.doppler.error.tokenNotConfigured'
  | 'secrets.doppler.error.apiError'

/** Translation record mapping secrets-doppler keys to translated strings. */
export type SecretsDopplerTranslations = Record<SecretsDopplerTranslationKey, string>
