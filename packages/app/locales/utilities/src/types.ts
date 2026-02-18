/** Translation keys for the utilities locale package. */
export type UtilitiesTranslationKey =
  | 'error.networkError'
  | 'error.timeout'
  | 'error.unauthorized'
  | 'error.forbidden'
  | 'error.notFound'
  | 'error.validationError'
  | 'error.serverError'
  | 'error.unknown'

/** Translation record mapping utilities keys to translated strings. */
export type UtilitiesTranslations = Record<UtilitiesTranslationKey, string>
