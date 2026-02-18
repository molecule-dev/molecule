import type { ConfigTranslations } from './types.js'

/** Config translations for Norwegian Bokmål. */
export const nb: ConfigTranslations = {
  'config.error.required': "Påkrevd konfigurasjon '{{key}}' er ikke angitt.",
  'config.error.mustBeNumber': "Konfigurasjon '{{key}}' må være et tall.",
  'config.error.minValue': "Konfigurasjon '{{key}}' må være minst {{min}}.",
  'config.error.maxValue': "Konfigurasjon '{{key}}' må være maks {{max}}.",
  'config.error.mustBeBoolean': "Konfigurasjon '{{key}}' må være en boolsk verdi (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurasjon '{{key}}' må være gyldig JSON.",
  'config.error.patternMismatch':
    "Konfigurasjon '{{key}}' samsvarer ikke med mønsteret '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurasjon '{{key}}' må være en av: {{values}}.",
  'config.error.validationNotSupported':
    'Gjeldende konfigurasjonsleverandør støtter ikke validering.',
}
