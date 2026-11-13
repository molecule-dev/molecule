import type { ChatTranslations } from './types.js'

/** Ai Chat translations for English. */
export const en: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'No response body',
  'chat.error.streamError': 'Stream error',
  'chat.error.unknownError': 'Unknown error',
  'chat.error.sendFailed': 'Failed to send message',
  'chat.error.stalled':
    '{{agentName}} stopped responding. It may still be finishing in the background — reload to see the latest, or send a new message.',
  'aiChat.error.noProvider': 'AI chat provider not configured. Bond an AI chat provider first.',
}
