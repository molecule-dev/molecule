import type { AiTranslations } from './types.js'

/** Ai translations for Czech. */
export const cs: AiTranslations = {
  'ai.error.noProvider': 'AI poskytovatel není nakonfigurován. Nejprve připojte AI poskytovatele.',
  'ai.error.apiError': 'Požadavek na AI API selhal.',
  'ai.error.noResponseBody': 'Tělo odpovědi AI je prázdné.',
  'ai.error.ambiguousProvider':
    'Je připojeno více pojmenovaných AI poskytovatelů a není nastaven žádný výchozí. Použijte getProviderByName(name) k výběru jednoho.',
}
