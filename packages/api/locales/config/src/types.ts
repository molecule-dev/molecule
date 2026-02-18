/** Translation keys for the config locale package. */
export type ConfigTranslationKey =
  | 'config.error.required'
  | 'config.error.mustBeNumber'
  | 'config.error.minValue'
  | 'config.error.maxValue'
  | 'config.error.mustBeBoolean'
  | 'config.error.mustBeJson'
  | 'config.error.patternMismatch'
  | 'config.error.invalidEnum'
  | 'config.error.validationNotSupported'

/** Translation record mapping config keys to translated strings. */
export type ConfigTranslations = Record<ConfigTranslationKey, string>
