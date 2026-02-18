import type { ConfigTranslations } from './types.js'

/** Config translations for Yoruba. */
export const yo: ConfigTranslations = {
  'config.error.required': "Iṣeto to nilo '{{key}}' ko ti ṣeto.",
  'config.error.mustBeNumber': "Iṣeto '{{key}}' gbọdọ jẹ nọmba kan.",
  'config.error.minValue': "Iṣeto '{{key}}' gbọdọ jẹ o kere ju {{min}}.",
  'config.error.maxValue': "Iṣeto '{{key}}' gbọdọ jẹ o pọ ju {{max}}.",
  'config.error.mustBeBoolean': "Iṣeto '{{key}}' gbọdọ jẹ boolean (true/false/1/0).",
  'config.error.mustBeJson': "Iṣeto '{{key}}' gbọdọ jẹ JSON to tọ.",
  'config.error.patternMismatch': "Iṣeto '{{key}}' ko baamu pẹlu ilana '{{pattern}}'.",
  'config.error.invalidEnum': "Iṣeto '{{key}}' gbọdọ jẹ ọkan ninu: {{values}}.",
  'config.error.validationNotSupported': 'Olutọju iṣeto lọwọlọwọ ko ṣe atilẹyin ifọwọsi.',
}
