import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Hungarian. */
export const hu: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nincs válasz törzs',
  'chat.error.streamError': 'Streamelési hiba',
  'chat.error.unknownError': 'Ismeretlen hiba',
  'chat.error.sendFailed': 'Nem sikerült elküldeni az üzenetet',
  'chat.error.stalled':
    '{{agentName}} nem válaszolt. Lehetséges, hogy a háttérben még befejeződik – töltse be újra az oldalt a legújabbak megtekintéséhez, vagy küldjön új üzenetet.',
  'aiChat.error.noProvider':
    'AI chat szolgáltató nincs konfigurálva. Először köss össze egy AI chat szolgáltatót.',
}
