import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Irish. */
export const ga: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Gan corp freagartha',
  'chat.error.streamError': 'Earráid sruthaithe',
  'chat.error.unknownError': 'Earráid anaithnid',
  'chat.error.sendFailed': 'Theip ar an teachtaireacht a sheoladh',
  'chat.error.stalled':
    'Stop {{agentName}} ag freagairt. B’fhéidir go bhfuil sé fós ag críochnú sa chúlra — athlódáil chun an ceann is déanaí a fheiceáil, nó seol teachtaireacht nua.',
  'aiChat.error.noProvider':
    'Níl an soláthraí comhrá AI cumraithe. Ceangail soláthraí comhrá AI ar dtús.',
}
