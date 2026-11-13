import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Swahili. */
export const sw: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Hakuna mwili wa jibu',
  'chat.error.streamError': 'Hitilafu ya utiririshaji',
  'chat.error.unknownError': 'Hitilafu isiyojulikana',
  'chat.error.sendFailed': 'Imeshindwa kutuma ujumbe',
  'chat.error.stalled':
    '{{agentName}} iliacha kujibu. Huenda bado inaisha chinichini — pakia upya ili kuona ya hivi punde, au tuma ujumbe mpya.',
  'aiChat.error.noProvider':
    'Mtoa huduma wa gumzo la AI hajasanidiwa. Weka mshirika wa mtoa huduma wa gumzo la AI kwanza.',
}
