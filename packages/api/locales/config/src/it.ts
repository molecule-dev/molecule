import type { ConfigTranslations } from './types.js'

/** Config translations for Italian. */
export const it: ConfigTranslations = {
  'config.error.required': "La configurazione richiesta '{{key}}' non è impostata.",
  'config.error.mustBeNumber': "La configurazione '{{key}}' deve essere un numero.",
  'config.error.minValue': "La configurazione '{{key}}' deve essere almeno {{min}}.",
  'config.error.maxValue': "La configurazione '{{key}}' deve essere al massimo {{max}}.",
  'config.error.mustBeBoolean':
    "La configurazione '{{key}}' deve essere un booleano (true/false/1/0).",
  'config.error.mustBeJson': "La configurazione '{{key}}' deve essere un JSON valido.",
  'config.error.patternMismatch':
    "La configurazione '{{key}}' non corrisponde al pattern '{{pattern}}'.",
  'config.error.invalidEnum': "La configurazione '{{key}}' deve essere uno tra: {{values}}.",
  'config.error.validationNotSupported':
    'Il provider di configurazione attuale non supporta la validazione.',
}
