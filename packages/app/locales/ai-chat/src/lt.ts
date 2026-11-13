import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Lithuanian. */
export const lt: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nėra atsakymo turinio',
  'chat.error.streamError': 'Srauto klaida',
  'chat.error.unknownError': 'Nežinoma klaida',
  'chat.error.sendFailed': 'Nepavyko išsiųsti pranešimo',
  'chat.error.stalled':
    '{{agentName}} nebereaguoja. Gali būti, kad jis vis dar baigia darbą fone – įkelkite iš naujo, kad pamatytumėte naujausius duomenis, arba išsiųskite naują pranešimą.',
}
