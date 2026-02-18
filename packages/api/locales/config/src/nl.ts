import type { ConfigTranslations } from './types.js'

/** Config translations for Dutch. */
export const nl: ConfigTranslations = {
  'config.error.required': "Vereiste configuratie '{{key}}' is niet ingesteld.",
  'config.error.mustBeNumber': "Configuratie '{{key}}' moet een getal zijn.",
  'config.error.minValue': "Configuratie '{{key}}' moet minimaal {{min}} zijn.",
  'config.error.maxValue': "Configuratie '{{key}}' mag maximaal {{max}} zijn.",
  'config.error.mustBeBoolean': "Configuratie '{{key}}' moet een boolean zijn (true/false/1/0).",
  'config.error.mustBeJson': "Configuratie '{{key}}' moet geldige JSON zijn.",
  'config.error.patternMismatch':
    "Configuratie '{{key}}' komt niet overeen met patroon '{{pattern}}'.",
  'config.error.invalidEnum': "Configuratie '{{key}}' moet een van de volgende zijn: {{values}}.",
  'config.error.validationNotSupported':
    'De huidige configuratieprovider ondersteunt geen validatie.',
}
