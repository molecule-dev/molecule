import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Welsh. */
export const cy: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Dim corff ymateb',
  'chat.error.streamError': 'Gwall ffrydio',
  'chat.error.unknownError': 'Gwall anhysbys',
  'chat.error.sendFailed': 'Methwyd anfon y neges',
  'chat.error.stalled':
    "Mae {{agentName}} wedi rhoi'r gorau i ymateb. Efallai ei fod yn dal i orffen yn y cefndir — ail-lwythwch i weld y diweddaraf, neu anfonwch neges newydd.",
  'aiChat.error.noProvider':
    'Darparwr sgwrs AI heb ei ffurfweddu. Cysylltwch â darparwr sgwrs AI yn gyntaf.',
}
