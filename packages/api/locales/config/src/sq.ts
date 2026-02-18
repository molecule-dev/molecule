import type { ConfigTranslations } from './types.js'

/** Config translations for Albanian. */
export const sq: ConfigTranslations = {
  'config.error.required': "Konfigurimi i kërkuar '{{key}}' nuk është vendosur.",
  'config.error.mustBeNumber': "Konfigurimi '{{key}}' duhet të jetë një numër.",
  'config.error.minValue': "Konfigurimi '{{key}}' duhet të jetë të paktën {{min}}.",
  'config.error.maxValue': "Konfigurimi '{{key}}' duhet të jetë më së shumti {{max}}.",
  'config.error.mustBeBoolean': "Konfigurimi '{{key}}' duhet të jetë një boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurimi '{{key}}' duhet të jetë JSON i vlefshëm.",
  'config.error.patternMismatch': "Konfigurimi '{{key}}' nuk përputhet me modelin '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurimi '{{key}}' duhet të jetë një nga: {{values}}.",
  'config.error.validationNotSupported':
    'Ofruesit aktual i konfigurimit nuk mbështet vlefshmërinë.',
}
