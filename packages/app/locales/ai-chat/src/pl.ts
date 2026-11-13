import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Polish. */
export const pl: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Brak treści odpowiedzi',
  'chat.error.streamError': 'Błąd strumieniowania',
  'chat.error.unknownError': 'Nieznany błąd',
  'chat.error.sendFailed': 'Nie udało się wysłać wiadomości',
  'chat.error.stalled':
    '{{agentName}} przestał odpowiadać. Możliwe, że nadal kończy działanie w tle — odśwież stronę, aby zobaczyć najnowsze informacje, lub wyślij nową wiadomość.',
  'aiChat.error.noProvider':
    'Dostawca czatu AI nie został skonfigurowany. Najpierw połącz dostawcę czatu AI.',
}
