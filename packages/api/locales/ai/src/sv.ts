import type { AiTranslations } from './types.js'

/** Ai translations for Swedish. */
export const sv: AiTranslations = {
  'ai.error.noProvider': 'AI-leverantör är inte konfigurerad. Anslut en AI-leverantör först.',
  'ai.error.apiError': 'AI API-begäran misslyckades.',
  'ai.error.noResponseBody': 'AI-svarskroppen är tom.',
  'ai.error.ambiguousProvider':
    'Flera namngivna AI-leverantörer är anslutna och ingen standard har angetts. Använd getProviderByName(name) för att välja en.',
}
