import type { ConfigTranslations } from './types.js'

/** Config translations for Welsh. */
export const cy: ConfigTranslations = {
  'config.error.required': "Nid yw'r ffiguriad gofynnol '{{key}}' wedi'i osod.",
  'config.error.mustBeNumber': "Rhaid i'r ffiguriad '{{key}}' fod yn rhif.",
  'config.error.minValue': "Rhaid i'r ffiguriad '{{key}}' fod o leiaf {{min}}.",
  'config.error.maxValue': "Rhaid i'r ffiguriad '{{key}}' fod ar y mwyaf {{max}}.",
  'config.error.mustBeBoolean': "Rhaid i'r ffiguriad '{{key}}' fod yn boolean (true/false/1/0).",
  'config.error.mustBeJson': "Rhaid i'r ffiguriad '{{key}}' fod yn JSON dilys.",
  'config.error.patternMismatch':
    "Nid yw'r ffiguriad '{{key}}' yn cyd-fynd â'r patrwm '{{pattern}}'.",
  'config.error.invalidEnum': "Rhaid i'r ffiguriad '{{key}}' fod yn un o: {{values}}.",
  'config.error.validationNotSupported': "Nid yw'r darparwr ffiguriad cyfredol yn cefnogi dilysu.",
}
