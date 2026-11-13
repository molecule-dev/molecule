import type { ConversationTranslations } from './types.js'

/** Conversation translations for Italian. */
export const it: ConversationTranslations = {
  'conversation.error.messageRequired': 'Il messaggio è obbligatorio',
  'conversation.error.aiNotConfigured': 'Provider IA non configurato',
  'conversation.error.unknownAiError': 'Errore IA sconosciuto',
  'conversation.error.notFound': 'Nessuna conversazione trovata',
  'conversation.error.streamError': 'Errore di streaming IA',
  'conversation.error.forbidden': 'Accesso negato',
  'conversation.error.unauthorized': 'Non autorizzato',
  'conversation.error.clearFailed': 'Impossibile cancellare la conversazione',
  'conversation.error.idRequired':
    'conversationId è obbligatorio quando il progetto ha più di una conversazione',
  'conversation.error.historyFailed': 'Impossibile caricare la cronologia della conversazione',
  'conversation.error.readFailed': 'Impossibile leggere la conversazione',
  'conversation.error.updateFailed': 'Impossibile aggiornare la conversazione',
}
