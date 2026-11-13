import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Zulu. */
export const zu: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Akukho umzimba wempendulo',
  'chat.error.streamError': 'Iphutha lokusakaza',
  'chat.error.unknownError': 'Iphutha elingaziwa',
  'chat.error.sendFailed': 'Yehlulekile ukuthumela umlayezo',
  'chat.error.stalled':
    '{{agentName}} iyeke ukuphendula. Kungase kusaphela ngemuva — layisha kabusha ukuze ubone okwakamuva, noma uthumele umlayezo omusha.',
  'aiChat.error.noProvider':
    'Umhlinzeki wengxoxo ye-AI akalungiselelwe. Bopha umhlinzeki wengxoxo ye-AI kuqala.',
}
