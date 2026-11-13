import type { AiTranslations } from './types.js'

/** Ai translations for Malayalam. */
export const ml: AiTranslations = {
  'ai.error.noProvider': 'AI ദാതാവ് കോൺഫിഗർ ചെയ്തിട്ടില്ല. ആദ്യം ഒരു AI ദാതാവിനെ ബോണ്ട് ചെയ്യുക.',
  'ai.error.ambiguousProvider':
    'ഒന്നിലധികം പേരുള്ള AI ദാതാക്കൾ ബോണ്ട് ചെയ്തിരിക്കുന്നു, ഡിഫോൾട്ട് സജ്ജീകരിച്ചിട്ടില്ല. ഒന്ന് തിരഞ്ഞെടുക്കാൻ getProviderByName(name) ഉപയോഗിക്കുക.',
  'ai.error.responseIncomplete':
    'AI പ്രതികരണം പൂർത്തിയാകുന്നതിന് മുമ്പ് അവസാനിച്ചു. വീണ്ടും ശ്രമിക്കുക.',
  'ai.error.responseTokenLimit':
    'പൂർത്തിയാകുന്നതിന് മുമ്പ് AI പ്രതികരണം ഔട്ട്‌പുട്ട് ടോക്കൺ പരിധിയിലെത്തി.',
  'ai.error.apiError': 'AI സേവന പിശക്. വീണ്ടും ശ്രമിക്കുക.',
  'ai.error.noResponseBody': 'AI സേവനത്തിൽ നിന്ന് പ്രതികരണമൊന്നുമില്ല.',
}
