import type { ConversationTranslations } from './types.js'

/** Conversation translations for Polish. */
export const pl: ConversationTranslations = {
  'conversation.error.messageRequired': 'message jest wymagane',
  'conversation.error.aiNotConfigured': 'Dostawca AI nie jest skonfigurowany',
  'conversation.error.unknownAiError': 'Nieznany błąd AI',
  'conversation.error.notFound': 'Nie znaleziono konwersacji',
  'conversation.error.streamError': 'Błąd strumieniowania AI',
  'conversation.error.forbidden': 'Odmowa dostępu',
  'conversation.error.unauthorized': 'Nieautoryzowane',
  'conversation.error.clearFailed': 'Nie udało się wyczyścić konwersacji',
  'conversation.error.idRequired':
    'conversationId jest wymagany, gdy projekt zawiera więcej niż jedną konwersację',
  'conversation.error.historyFailed': 'Nie udało się załadować historii konwersacji',
  'conversation.error.readFailed': 'Nie udało się odczytać konwersacji',
  'conversation.error.updateFailed': 'Nie udało się zaktualizować konwersacji',
}
