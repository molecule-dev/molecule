import type { ConfigTranslations } from './types.js'

/** Config translations for Hausa. */
export const ha: ConfigTranslations = {
  'config.error.required': "Ba a saita tsarin da ake buƙata '{{key}}' ba.",
  'config.error.mustBeNumber': "Tsarin '{{key}}' dole ne ya zama lamba.",
  'config.error.minValue': "Tsarin '{{key}}' dole ne ya kasance aƙalla {{min}}.",
  'config.error.maxValue': "Tsarin '{{key}}' dole ne ya kasance a mafi yawa {{max}}.",
  'config.error.mustBeBoolean': "Tsarin '{{key}}' dole ne ya zama boolean (true/false/1/0).",
  'config.error.mustBeJson': "Tsarin '{{key}}' dole ne ya zama ingantaccen JSON.",
  'config.error.patternMismatch': "Tsarin '{{key}}' bai dace da tsarin '{{pattern}}' ba.",
  'config.error.invalidEnum': "Tsarin '{{key}}' dole ne ya zama ɗaya daga cikin: {{values}}.",
  'config.error.validationNotSupported': 'Mai samar da tsarin yanzu ba ya goyan bayan ingantawa.',
}
