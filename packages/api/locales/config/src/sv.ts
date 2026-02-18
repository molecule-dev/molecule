import type { ConfigTranslations } from './types.js'

/** Config translations for Swedish. */
export const sv: ConfigTranslations = {
  'config.error.required': "Obligatorisk konfiguration '{{key}}' är inte angiven.",
  'config.error.mustBeNumber': "Konfiguration '{{key}}' måste vara ett nummer.",
  'config.error.minValue': "Konfiguration '{{key}}' måste vara minst {{min}}.",
  'config.error.maxValue': "Konfiguration '{{key}}' får vara högst {{max}}.",
  'config.error.mustBeBoolean':
    "Konfiguration '{{key}}' måste vara ett booleskt värde (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguration '{{key}}' måste vara giltig JSON.",
  'config.error.patternMismatch': "Konfiguration '{{key}}' matchar inte mönstret '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguration '{{key}}' måste vara en av: {{values}}.",
  'config.error.validationNotSupported':
    'Den aktuella konfigurationsleverantören stöder inte validering.',
}
