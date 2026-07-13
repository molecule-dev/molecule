import type { AiTranslations } from './types.js'

/** Ai translations for Malayalam. */
export const ml: AiTranslations = {
  'ai.error.noProvider': 'AI ദാതാവ് കോൺഫിഗർ ചെയ്തിട്ടില്ല. ആദ്യം ഒരു AI ദാതാവിനെ ബോണ്ട് ചെയ്യുക.',
  'ai.error.apiError': 'AI API അഭ്യർത്ഥന പരാജയപ്പെട്ടു.',
  'ai.error.noResponseBody': 'AI പ്രതികരണ ബോഡി ശൂന്യമാണ്.',
  'ai.error.ambiguousProvider':
    'ഒന്നിലധികം പേരുള്ള AI ദാതാക്കൾ ബോണ്ട് ചെയ്തിരിക്കുന്നു, ഡിഫോൾട്ട് സജ്ജീകരിച്ചിട്ടില്ല. ഒന്ന് തിരഞ്ഞെടുക്കാൻ getProviderByName(name) ഉപയോഗിക്കുക.',
}
