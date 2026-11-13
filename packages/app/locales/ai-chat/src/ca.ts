import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Catalan. */
export const ca: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Sense cos de resposta',
  'chat.error.streamError': 'Error de transmissió',
  'chat.error.unknownError': 'Error desconegut',
  'chat.error.sendFailed': "No s'ha pogut enviar el missatge",
  'chat.error.stalled':
    '{{agentName}} ha deixat de respondre. Pot ser que encara estigui finalitzant en segon pla; torna a carregar per veure les últimes novetats o envia un missatge nou.',
  'aiChat.error.noProvider':
    "Proveïdor de xat d'IA no configurat. Primer connecta un proveïdor de xat d'IA.",
}
