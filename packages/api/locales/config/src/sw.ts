import type { ConfigTranslations } from './types.js'

/** Config translations for Swahili. */
export const sw: ConfigTranslations = {
  'config.error.required': "Usanidi unaohitajika '{{key}}' haujawekwa.",
  'config.error.mustBeNumber': "Usanidi '{{key}}' lazima uwe nambari.",
  'config.error.minValue': "Usanidi '{{key}}' lazima uwe angalau {{min}}.",
  'config.error.maxValue': "Usanidi '{{key}}' lazima uwe kwa upeo wa juu {{max}}.",
  'config.error.mustBeBoolean': "Usanidi '{{key}}' lazima uwe boolean (true/false/1/0).",
  'config.error.mustBeJson': "Usanidi '{{key}}' lazima uwe JSON halali.",
  'config.error.patternMismatch': "Usanidi '{{key}}' haulingani na muundo '{{pattern}}'.",
  'config.error.invalidEnum': "Usanidi '{{key}}' lazima uwe moja kati ya: {{values}}.",
  'config.error.validationNotSupported': 'Mtoa huduma wa usanidi wa sasa hauitumii uthibitishaji.',
}
