import type { ConfigTranslations } from './types.js'

/** Config translations for English. */
export const en: ConfigTranslations = {
  'config.error.required': "Required configuration '{{key}}' is not set.",
  'config.error.mustBeNumber': "Configuration '{{key}}' must be a number.",
  'config.error.minValue': "Configuration '{{key}}' must be at least {{min}}.",
  'config.error.maxValue': "Configuration '{{key}}' must be at most {{max}}.",
  'config.error.mustBeBoolean': "Configuration '{{key}}' must be a boolean (true/false/1/0).",
  'config.error.mustBeJson': "Configuration '{{key}}' must be valid JSON.",
  'config.error.patternMismatch': "Configuration '{{key}}' does not match pattern '{{pattern}}'.",
  'config.error.invalidEnum': "Configuration '{{key}}' must be one of: {{values}}.",
  'config.error.validationNotSupported':
    'Current configuration provider does not support validation.',
}
