import type { ConfigTranslations } from './types.js'

/** Config translations for Catalan. */
export const ca: ConfigTranslations = {
  'config.error.required': "La configuració requerida '{{key}}' no està establerta.",
  'config.error.mustBeNumber': "La configuració '{{key}}' ha de ser un número.",
  'config.error.minValue': "La configuració '{{key}}' ha de ser com a mínim {{min}}.",
  'config.error.maxValue': "La configuració '{{key}}' ha de ser com a màxim {{max}}.",
  'config.error.mustBeBoolean': "La configuració '{{key}}' ha de ser un booleà (true/false/1/0).",
  'config.error.mustBeJson': "La configuració '{{key}}' ha de ser JSON vàlid.",
  'config.error.patternMismatch':
    "La configuració '{{key}}' no coincideix amb el patró '{{pattern}}'.",
  'config.error.invalidEnum': "La configuració '{{key}}' ha de ser un de: {{values}}.",
  'config.error.validationNotSupported': 'El proveïdor de configuració actual no admet validació.',
}
