import type { ConfigTranslations } from './types.js'

/** Config translations for Croatian. */
export const hr: ConfigTranslations = {
  'config.error.required': "Obavezna konfiguracija '{{key}}' nije postavljena.",
  'config.error.mustBeNumber': "Konfiguracija '{{key}}' mora biti broj.",
  'config.error.minValue': "Konfiguracija '{{key}}' mora biti najmanje {{min}}.",
  'config.error.maxValue': "Konfiguracija '{{key}}' mora biti najviše {{max}}.",
  'config.error.mustBeBoolean': "Konfiguracija '{{key}}' mora biti boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguracija '{{key}}' mora biti važeći JSON.",
  'config.error.patternMismatch': "Konfiguracija '{{key}}' ne odgovara uzorku '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguracija '{{key}}' mora biti jedna od: {{values}}.",
  'config.error.validationNotSupported': 'Trenutni pružatelj konfiguracije ne podržava validaciju.',
}
