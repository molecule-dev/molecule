import type { ConfigTranslations } from './types.js'

/** Config translations for Finnish. */
export const fi: ConfigTranslations = {
  'config.error.required': "Vaadittu konfiguraatio '{{key}}' ei ole asetettu.",
  'config.error.mustBeNumber': "Konfiguraation '{{key}}' on oltava numero.",
  'config.error.minValue': "Konfiguraation '{{key}}' on oltava vähintään {{min}}.",
  'config.error.maxValue': "Konfiguraation '{{key}}' saa olla enintään {{max}}.",
  'config.error.mustBeBoolean': "Konfiguraation '{{key}}' on oltava totuusarvo (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguraation '{{key}}' on oltava kelvollinen JSON.",
  'config.error.patternMismatch': "Konfiguraatio '{{key}}' ei vastaa mallia '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguraation '{{key}}' on oltava jokin seuraavista: {{values}}.",
  'config.error.validationNotSupported': 'Nykyinen konfiguraatiotoimittaja ei tue validointia.',
}
