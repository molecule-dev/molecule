import type { ConfigTranslations } from './types.js'

/** Config translations for Latvian. */
export const lv: ConfigTranslations = {
  'config.error.required': "Nepieciešamā konfigurācija '{{key}}' nav iestatīta.",
  'config.error.mustBeNumber': "Konfigurācijai '{{key}}' jābūt skaitlim.",
  'config.error.minValue': "Konfigurācijai '{{key}}' jābūt vismaz {{min}}.",
  'config.error.maxValue': "Konfigurācijai '{{key}}' jābūt ne vairāk kā {{max}}.",
  'config.error.mustBeBoolean': "Konfigurācijai '{{key}}' jābūt Būla vērtībai (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurācijai '{{key}}' jābūt derīgam JSON.",
  'config.error.patternMismatch': "Konfigurācija '{{key}}' neatbilst modelim '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurācijai '{{key}}' jābūt vienam no: {{values}}.",
  'config.error.validationNotSupported':
    'Pašreizējais konfigurācijas nodrošinātājs neatbalsta validāciju.',
}
