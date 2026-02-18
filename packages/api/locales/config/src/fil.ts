import type { ConfigTranslations } from './types.js'

/** Config translations for Filipino. */
export const fil: ConfigTranslations = {
  'config.error.required': "Ang kinakailangang configuration '{{key}}' ay hindi nakatakda.",
  'config.error.mustBeNumber': "Ang configuration '{{key}}' ay dapat na numero.",
  'config.error.minValue': "Ang configuration '{{key}}' ay dapat na hindi bababa sa {{min}}.",
  'config.error.maxValue': "Ang configuration '{{key}}' ay dapat na hindi hihigit sa {{max}}.",
  'config.error.mustBeBoolean': "Ang configuration '{{key}}' ay dapat na boolean (true/false/1/0).",
  'config.error.mustBeJson': "Ang configuration '{{key}}' ay dapat na wastong JSON.",
  'config.error.patternMismatch':
    "Ang configuration '{{key}}' ay hindi tumutugma sa pattern na '{{pattern}}'.",
  'config.error.invalidEnum':
    "Ang configuration '{{key}}' ay dapat na isa sa mga sumusunod: {{values}}.",
  'config.error.validationNotSupported':
    'Ang kasalukuyang configuration provider ay hindi sumusuporta sa validation.',
}
