import type { AiTranslations } from './types.js'

/** Ai translations for Swedish. */
export const sv: AiTranslations = {
  'ai.error.noProvider': 'AI-leverantör är inte konfigurerad. Anslut en AI-leverantör först.',
  'ai.error.ambiguousProvider':
    'Flera namngivna AI-leverantörer är anslutna och ingen standard har angetts. Använd getProviderByName(name) för att välja en.',
  'ai.error.responseIncomplete': 'AI-svaret avslutades innan det slutfördes. Försök igen.',
  'ai.error.responseTokenLimit': 'AI-svaret nådde gränsen för utdatatoken innan det slutfördes.',
  'ai.error.apiError': 'Fel i AI-tjänsten. Försök igen.',
  'ai.error.noResponseBody': 'Inget svar från AI-tjänsten.',
}
