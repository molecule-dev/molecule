import type { AiTranslations } from './types.js'

/** Ai translations for Tamil. */
export const ta: AiTranslations = {
  'ai.error.noProvider': 'AI வழங்குநர் கட்டமைக்கப்படவில்லை. முதலில் AI வழங்குநரை இணைக்கவும்.',
  'ai.error.apiError': 'AI API கோரிக்கை தோல்வியடைந்தது.',
  'ai.error.noResponseBody': 'AI பதில் உடல் காலியாக உள்ளது.',
  'ai.error.ambiguousProvider':
    'பல பெயரிடப்பட்ட AI வழங்குநர்கள் இணைக்கப்பட்டுள்ளன, இயல்புநிலை எதுவும் அமைக்கப்படவில்லை. ஒன்றைத் தேர்ந்தெடுக்க getProviderByName(name) ஐப் பயன்படுத்தவும்.',
}
