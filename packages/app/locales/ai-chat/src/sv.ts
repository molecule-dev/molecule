import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Swedish. */
export const sv: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Inget svarsinnehåll',
  'chat.error.streamError': 'Strömningsfel',
  'chat.error.unknownError': 'Okänt fel',
  'chat.error.sendFailed': 'Misslyckades med att skicka meddelandet',
  'chat.error.stalled':
    '{{agentName}} har slutat svara. Den kan fortfarande slutföras i bakgrunden — ladda om för att se det senaste eller skicka ett nytt meddelande.',
  'aiChat.error.noProvider':
    'AI-chattleverantören är inte konfigurerad. Koppla först till en AI-chattleverantör.',
}
