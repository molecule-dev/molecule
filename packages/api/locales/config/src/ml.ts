import type { ConfigTranslations } from './types.js'

/** Config translations for Malayalam. */
export const ml: ConfigTranslations = {
  'config.error.required': "ആവശ്യമായ കോൺഫിഗറേഷൻ '{{key}}' സജ്ജീകരിച്ചിട്ടില്ല.",
  'config.error.mustBeNumber': "കോൺഫിഗറേഷൻ '{{key}}' ഒരു സംഖ്യയായിരിക്കണം.",
  'config.error.minValue': "കോൺഫിഗറേഷൻ '{{key}}' കുറഞ്ഞത് {{min}} ആയിരിക്കണം.",
  'config.error.maxValue': "കോൺഫിഗറേഷൻ '{{key}}' പരമാവധി {{max}} ആയിരിക്കണം.",
  'config.error.mustBeBoolean': "കോൺഫിഗറേഷൻ '{{key}}' ഒരു ബൂളിയൻ ആയിരിക്കണം (true/false/1/0).",
  'config.error.mustBeJson': "കോൺഫിഗറേഷൻ '{{key}}' സാധുവായ JSON ആയിരിക്കണം.",
  'config.error.patternMismatch':
    "കോൺഫിഗറേഷൻ '{{key}}' പാറ്റേൺ '{{pattern}}' യുമായി പൊരുത്തപ്പെടുന്നില്ല.",
  'config.error.invalidEnum': "കോൺഫിഗറേഷൻ '{{key}}' ഇവയിൽ ഒന്നായിരിക്കണം: {{values}}.",
  'config.error.validationNotSupported':
    'നിലവിലെ കോൺഫിഗറേഷൻ പ്രൊവൈഡർ മൂല്യനിർണ്ണയത്തെ പിന്തുണയ്ക്കുന്നില്ല.',
}
