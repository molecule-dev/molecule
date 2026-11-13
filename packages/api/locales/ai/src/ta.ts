import type { AiTranslations } from './types.js'

/** Ai translations for Tamil. */
export const ta: AiTranslations = {
  'ai.error.noProvider': 'AI வழங்குநர் கட்டமைக்கப்படவில்லை. முதலில் AI வழங்குநரை இணைக்கவும்.',
  'ai.error.ambiguousProvider':
    'பல பெயரிடப்பட்ட AI வழங்குநர்கள் இணைக்கப்பட்டுள்ளன, இயல்புநிலை எதுவும் அமைக்கப்படவில்லை. ஒன்றைத் தேர்ந்தெடுக்க getProviderByName(name) ஐப் பயன்படுத்தவும்.',
  'ai.error.responseIncomplete':
    'செயற்கை நுண்ணறிவின் பதில் முழுமையடைவதற்குள் நின்றுவிட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
  'ai.error.responseTokenLimit':
    'AI பதில் நிறைவடைவதற்கு முன்பே வெளியீட்டு டோக்கன் வரம்பை எட்டியது.',
  'ai.error.apiError': 'AI சேவைப் பிழை. மீண்டும் முயற்சிக்கவும்.',
  'ai.error.noResponseBody': 'AI சேவையிடமிருந்து எந்தப் பதிலும் வரவில்லை.',
}
