import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Filipino. */
export const fil: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Walang response body',
  'chat.error.streamError': 'May error sa stream',
  'chat.error.unknownError': 'Hindi kilalang error',
  'chat.error.sendFailed': 'Nabigong magpadala ng mensahe',
  'chat.error.stalled':
    'Tumigil sa pagtugon {{agentName}} . Maaaring natatapos pa rin ito sa background — i-reload para makita ang pinakabago, o magpadala ng bagong mensahe.',
}
