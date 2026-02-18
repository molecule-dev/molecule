import type { ConfigTranslations } from './types.js'

/** Config translations for Lithuanian. */
export const lt: ConfigTranslations = {
  'config.error.required': "Privaloma konfigūracija '{{key}}' nenustatyta.",
  'config.error.mustBeNumber': "Konfigūracija '{{key}}' turi būti skaičius.",
  'config.error.minValue': "Konfigūracija '{{key}}' turi būti bent {{min}}.",
  'config.error.maxValue': "Konfigūracija '{{key}}' turi būti ne daugiau kaip {{max}}.",
  'config.error.mustBeBoolean':
    "Konfigūracija '{{key}}' turi būti loginė reikšmė (true/false/1/0).",
  'config.error.mustBeJson': "Konfigūracija '{{key}}' turi būti galiojantis JSON.",
  'config.error.patternMismatch': "Konfigūracija '{{key}}' neatitinka šablono '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigūracija '{{key}}' turi būti viena iš: {{values}}.",
  'config.error.validationNotSupported':
    'Dabartinis konfigūracijos tiekėjas nepalaiko patvirtinimo.',
}
