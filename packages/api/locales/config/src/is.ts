import type { ConfigTranslations } from './types.js'

/** Config translations for Icelandic. */
export const is: ConfigTranslations = {
  'config.error.required': "Nauðsynleg stillingar '{{key}}' eru ekki settar.",
  'config.error.mustBeNumber': "Stillingar '{{key}}' verða að vera tala.",
  'config.error.minValue': "Stillingar '{{key}}' verða að vera að minnsta kosti {{min}}.",
  'config.error.maxValue': "Stillingar '{{key}}' mega vera að hámarki {{max}}.",
  'config.error.mustBeBoolean': "Stillingar '{{key}}' verða að vera boolean (true/false/1/0).",
  'config.error.mustBeJson': "Stillingar '{{key}}' verða að vera gilt JSON.",
  'config.error.patternMismatch': "Stillingar '{{key}}' passa ekki við mynstur '{{pattern}}'.",
  'config.error.invalidEnum': "Stillingar '{{key}}' verða að vera eitt af: {{values}}.",
  'config.error.validationNotSupported': 'Núverandi stillingar veitandi styður ekki sannprófun.',
}
