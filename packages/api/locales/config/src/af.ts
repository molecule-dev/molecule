import type { ConfigTranslations } from './types.js'

/** Config translations for Afrikaans. */
export const af: ConfigTranslations = {
  'config.error.required': "Vereiste konfigurasie '{{key}}' is nie gestel nie.",
  'config.error.mustBeNumber': "Konfigurasie '{{key}}' moet 'n getal wees.",
  'config.error.minValue': "Konfigurasie '{{key}}' moet ten minste {{min}} wees.",
  'config.error.maxValue': "Konfigurasie '{{key}}' mag hoogstens {{max}} wees.",
  'config.error.mustBeBoolean': "Konfigurasie '{{key}}' moet 'n boolean wees (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurasie '{{key}}' moet geldige JSON wees.",
  'config.error.patternMismatch':
    "Konfigurasie '{{key}}' stem nie ooreen met patroon '{{pattern}}' nie.",
  'config.error.invalidEnum': "Konfigurasie '{{key}}' moet een van die volgende wees: {{values}}.",
  'config.error.validationNotSupported':
    'Huidige konfigurasieverskaffer ondersteun nie validering nie.',
}
