import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Czech. */
export const cs: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Žádné tělo odpovědi',
  'chat.error.streamError': 'Chyba streamování',
  'chat.error.unknownError': 'Neznámá chyba',
  'chat.error.sendFailed': 'Zprávu se nepodařilo odeslat',
  'chat.error.stalled':
    '{{agentName}} přestal odpovídat. Je možné, že stále dokončuje načítání na pozadí – znovu načtěte pro zobrazení nejnovějších informací nebo odešlete novou zprávu.',
}
