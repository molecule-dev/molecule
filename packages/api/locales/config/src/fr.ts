import type { ConfigTranslations } from './types.js'

/** Config translations for French. */
export const fr: ConfigTranslations = {
  'config.error.required': "La configuration requise '{{key}}' n'est pas définie.",
  'config.error.mustBeNumber': "La configuration '{{key}}' doit être un nombre.",
  'config.error.minValue': "La configuration '{{key}}' doit être au moins {{min}}.",
  'config.error.maxValue': "La configuration '{{key}}' doit être au plus {{max}}.",
  'config.error.mustBeBoolean': "La configuration '{{key}}' doit être un booléen (true/false/1/0).",
  'config.error.mustBeJson': "La configuration '{{key}}' doit être un JSON valide.",
  'config.error.patternMismatch':
    "La configuration '{{key}}' ne correspond pas au modèle '{{pattern}}'.",
  'config.error.invalidEnum':
    "La configuration '{{key}}' doit être l'une des valeurs suivantes : {{values}}.",
  'config.error.validationNotSupported':
    'Le fournisseur de configuration actuel ne prend pas en charge la validation.',
}
