import type { ConfigTranslations } from './types.js'

/** Config translations for Igbo. */
export const ig: ConfigTranslations = {
  'config.error.required': "Nhazi achọrọ '{{key}}' ahazibeghị.",
  'config.error.mustBeNumber': "Nhazi '{{key}}' ga-abụrịrị nọmba.",
  'config.error.minValue': "Nhazi '{{key}}' ga-abụrịrị opekempe {{min}}.",
  'config.error.maxValue': "Nhazi '{{key}}' ga-abụrịrị kacha {{max}}.",
  'config.error.mustBeBoolean': "Nhazi '{{key}}' ga-abụrịrị boolean (true/false/1/0).",
  'config.error.mustBeJson': "Nhazi '{{key}}' ga-abụrịrị JSON ziri ezi.",
  'config.error.patternMismatch': "Nhazi '{{key}}' adabaghị na ụkpụrụ '{{pattern}}'.",
  'config.error.invalidEnum': "Nhazi '{{key}}' ga-abụrịrị otu n'ime: {{values}}.",
  'config.error.validationNotSupported': 'Onye na-enye nhazi ugbu a anaghị akwado nkwenye.',
}
