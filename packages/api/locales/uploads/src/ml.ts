import type { UploadsTranslations } from './types.js'

/** Uploads translations for Malayalam. */
export const ml: UploadsTranslations = {
  'uploads.error.noProvider':
    'അപ്‌ലോഡ് പ്രൊവൈഡര്‍ കോണ്‍ഫിഗര്‍ ചെയ്തിട്ടില്ല. ആദ്യം setProvider() വിളിക്കുക.',
  'uploads.error.streamLimitReached': 'സ്ട്രീം പരിധി എത്തി.',
  'uploads.error.aborted': 'അപ്‌ലോഡ് റദ്ദാക്കി.',
  'uploads.error.fileTypeBlocked': '{{type}} തരത്തിലുള്ള ഫയലുകൾ അപ്‌ലോഡ് ചെയ്യാനാകില്ല.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} പട്ടികപ്പെടുത്തുന്നു, ബ്രൗസർ പ്രവർത്തിപ്പിക്കുന്ന ഒരു തരം. അത് സംഭരിക്കാൻ allowActiveTypes: true നൽകുക, ആ ഫയലുകൾ sendUpload() ഉപയോഗിച്ച് നൽകുക.',
}
