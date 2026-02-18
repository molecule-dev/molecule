import type { ConfigTranslations } from './types.js'

/** Config translations for Estonian. */
export const et: ConfigTranslations = {
  'config.error.required': "Nõutav konfiguratsioon '{{key}}' ei ole määratud.",
  'config.error.mustBeNumber': "Konfiguratsioon '{{key}}' peab olema number.",
  'config.error.minValue': "Konfiguratsioon '{{key}}' peab olema vähemalt {{min}}.",
  'config.error.maxValue': "Konfiguratsioon '{{key}}' peab olema maksimaalselt {{max}}.",
  'config.error.mustBeBoolean': "Konfiguratsioon '{{key}}' peab olema tõeväärtus (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguratsioon '{{key}}' peab olema kehtiv JSON.",
  'config.error.patternMismatch': "Konfiguratsioon '{{key}}' ei vasta mustrile '{{pattern}}'.",
  'config.error.invalidEnum': "Konfiguratsioon '{{key}}' peab olema üks järgmistest: {{values}}.",
  'config.error.validationNotSupported': 'Praegune konfiguratsioonipakkuja ei toeta valideerimist.',
}
