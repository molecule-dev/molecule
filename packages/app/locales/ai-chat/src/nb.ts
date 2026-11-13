import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Norwegian Bokmål. */
export const nb: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Ingen responsinnhold',
  'chat.error.streamError': 'Strømmingsfeil',
  'chat.error.unknownError': 'Ukjent feil',
  'chat.error.sendFailed': 'Kunne ikke sende meldingen',
  'chat.error.stalled':
    '{{agentName}} har sluttet å svare. Den kan fortsatt fullføres i bakgrunnen – last inn på nytt for å se det siste, eller send en ny melding.',
}
