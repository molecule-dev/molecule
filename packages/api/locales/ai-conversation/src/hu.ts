import type { ConversationTranslations } from './types.js'

/** Conversation translations for Hungarian. */
export const hu: ConversationTranslations = {
  'conversation.error.messageRequired': 'Üzenet megadása kötelező',
  'conversation.error.aiNotConfigured': 'AI szolgáltató nincs konfigurálva',
  'conversation.error.unknownAiError': 'Ismeretlen AI hiba',
  'conversation.error.notFound': 'Nem található beszélgetés',
  'conversation.error.streamError': 'AI streamelési hiba',
  'conversation.error.forbidden': 'Hozzáférés megtagadva',
  'conversation.error.unauthorized': 'Jogosulatlan',
  'conversation.error.clearFailed': 'Nem sikerült törölni a beszélgetést',
  'conversation.error.idRequired':
    'A conversationId megadása kötelező, ha a projekt egynél több beszélgetést tartalmaz.',
  'conversation.error.historyFailed': 'Nem sikerült betölteni a beszélgetési előzményeket',
  'conversation.error.readFailed': 'Nem sikerült elolvasni a beszélgetést',
  'conversation.error.updateFailed': 'Nem sikerült frissíteni a beszélgetést',
}
