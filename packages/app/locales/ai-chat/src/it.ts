import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Italian. */
export const it: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nessun corpo della risposta',
  'chat.error.streamError': 'Errore di streaming',
  'chat.error.unknownError': 'Errore sconosciuto',
  'chat.error.sendFailed': 'Invio del messaggio non riuscito',
  'chat.error.stalled':
    '{{agentName}} ha smesso di rispondere. Potrebbe essere ancora in fase di elaborazione in background: ricarica la pagina per visualizzare gli aggiornamenti o invia un nuovo messaggio.',
  'aiChat.error.noProvider':
    'Provider di chat AI non configurato. Collega prima un provider di chat AI.',
}
