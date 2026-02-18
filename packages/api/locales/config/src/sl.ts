import type { ConfigTranslations } from './types.js'

/** Config translations for Slovenian. */
export const sl: ConfigTranslations = {
  'config.error.required': "Zahtevana konfiguracija '{{key}}' ni nastavljena.",
  'config.error.mustBeNumber': "Konfiguracija '{{key}}' mora biti število.",
  'config.error.minValue': "Konfiguracija '{{key}}' mora biti vsaj {{min}}.",
  'config.error.maxValue': "Konfiguracija '{{key}}' mora biti največ {{max}}.",
  'config.error.mustBeBoolean': "Konfiguracija '{{key}}' mora biti boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguracija '{{key}}' mora biti veljaven JSON.",
  'config.error.patternMismatch': "Konfiguracija '{{key}}' se ne ujema z vzorcem '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguracija '{{key}}' mora biti ena od: {{values}}.",
  'config.error.validationNotSupported': 'Trenutni ponudnik konfiguracije ne podpira validacije.',
}
