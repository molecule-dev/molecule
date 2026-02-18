import type { ConfigTranslations } from './types.js'

/** Config translations for Danish. */
export const da: ConfigTranslations = {
  'config.error.required': "Påkrævet konfiguration '{{key}}' er ikke angivet.",
  'config.error.mustBeNumber': "Konfiguration '{{key}}' skal være et tal.",
  'config.error.minValue': "Konfiguration '{{key}}' skal være mindst {{min}}.",
  'config.error.maxValue': "Konfiguration '{{key}}' må højst være {{max}}.",
  'config.error.mustBeBoolean': "Konfiguration '{{key}}' skal være en boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguration '{{key}}' skal være gyldig JSON.",
  'config.error.patternMismatch': "Konfiguration '{{key}}' matcher ikke mønsteret '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguration '{{key}}' skal være en af: {{values}}.",
  'config.error.validationNotSupported':
    'Den nuværende konfigurationsudbyder understøtter ikke validering.',
}
