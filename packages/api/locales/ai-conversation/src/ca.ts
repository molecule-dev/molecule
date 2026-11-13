import type { ConversationTranslations } from './types.js'

/** Conversation translations for Catalan. */
export const ca: ConversationTranslations = {
  'conversation.error.messageRequired': 'Es requereix un missatge',
  'conversation.error.aiNotConfigured': "Proveïdor d'IA no configurat",
  'conversation.error.unknownAiError': "Error d'IA desconegut",
  'conversation.error.notFound': "No s'ha trobat cap conversa",
  'conversation.error.streamError': "Error de transmissió d'IA",
  'conversation.error.forbidden': 'Accés denegat',
  'conversation.error.unauthorized': 'No autoritzat',
  'conversation.error.clearFailed': "No s'ha pogut esborrar la conversa",
  'conversation.error.idRequired':
    "conversationId és obligatori quan el projecte té més d'una conversa.",
  'conversation.error.historyFailed': "No s'ha pogut carregar l'historial de converses",
  'conversation.error.readFailed': "No s'ha pogut llegir la conversa",
  'conversation.error.updateFailed': "No s'ha pogut actualitzar la conversa",
}
