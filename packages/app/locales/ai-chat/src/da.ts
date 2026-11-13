import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Danish. */
export const da: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Ingen svarindhold',
  'chat.error.streamError': 'Streamingfejl',
  'chat.error.unknownError': 'Ukendt fejl',
  'chat.error.sendFailed': 'Kunne ikke sende beskeden',
  'chat.error.stalled':
    '{{agentName}} svarede ikke længere. Den afslutter muligvis stadig i baggrunden — genindlæs for at se det seneste, eller send en ny besked.',
  'aiChat.error.noProvider':
    'AI-chatudbyder er ikke konfigureret. Forbind først en AI-chatudbyder.',
}
