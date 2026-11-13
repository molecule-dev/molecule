import type { ConversationTranslations } from './types.js'

/** Conversation translations for Danish. */
export const da: ConversationTranslations = {
  'conversation.error.messageRequired': 'besked er påkrævet',
  'conversation.error.aiNotConfigured': 'AI-udbyder ikke konfigureret',
  'conversation.error.unknownAiError': 'Ukendt AI-fejl',
  'conversation.error.notFound': 'Ingen samtale fundet',
  'conversation.error.streamError': 'AI-streamingfejl',
  'conversation.error.forbidden': 'Adgang nægtet',
  'conversation.error.unauthorized': 'Uberettiget',
  'conversation.error.clearFailed': 'Samtalen kunne ikke ryddes',
  'conversation.error.idRequired':
    'conversationId er påkrævet, når projektet har mere end én samtale',
  'conversation.error.historyFailed': 'Konversationshistorikken kunne ikke indlæses',
  'conversation.error.readFailed': 'Kunne ikke læse samtalen',
  'conversation.error.updateFailed': 'Samtalen kunne ikke opdateres',
}
