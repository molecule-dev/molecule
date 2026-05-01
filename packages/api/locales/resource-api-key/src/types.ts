/** Translation keys for the api-key resource locale package. */
export type ResourceApiKeyTranslationKey =
  | 'resourceApiKey.error.notFound'
  | 'resourceApiKey.error.revoked'
  | 'resourceApiKey.error.expired'
  | 'resourceApiKey.error.invalid'

/** Translation record mapping api-key keys to translated strings. */
export type ResourceApiKeyTranslations = Record<ResourceApiKeyTranslationKey, string>
