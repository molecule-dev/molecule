import type { AiTranslations } from './types.js'

/** Ai translations for Czech. */
export const cs: AiTranslations = {
  'ai.error.noProvider': 'AI poskytovatel není nakonfigurován. Nejprve připojte AI poskytovatele.',
  'ai.error.ambiguousProvider':
    'Je připojeno více pojmenovaných AI poskytovatelů a není nastaven žádný výchozí. Použijte getProviderByName(name) k výběru jednoho.',
  'ai.error.responseIncomplete':
    'Odpověď umělé inteligence skončila před dokončením. Zkuste to prosím znovu.',
  'ai.error.responseTokenLimit':
    'Odpověď umělé inteligence dosáhla limitu výstupních tokenů před dokončením.',
  'ai.error.apiError': 'Chyba služby umělé inteligence. Zkuste to prosím znovu.',
  'ai.error.noResponseBody': 'Žádná odpověď od služby AI.',
}
