import type { ConversationTranslations } from './types.js'

/** Conversation translations for Swedish. */
export const sv: ConversationTranslations = {
  'conversation.error.messageRequired': 'meddelande krävs',
  'conversation.error.aiNotConfigured': 'AI-leverantör inte konfigurerad',
  'conversation.error.unknownAiError': 'Okänt AI-fel',
  'conversation.error.notFound': 'Ingen konversation hittad',
  'conversation.error.streamError': 'AI-strömningsfel',
  'conversation.error.forbidden': 'Åtkomst nekad',
  'conversation.error.unauthorized': 'Obehörig',
  'conversation.error.clearFailed': 'Det gick inte att rensa konversationen',
  'conversation.error.idRequired': 'conversationId krävs när projektet har mer än en konversation',
  'conversation.error.historyFailed': 'Det gick inte att läsa in konversationshistoriken',
  'conversation.error.readFailed': 'Kunde inte läsa konversationen',
  'conversation.error.updateFailed': 'Det gick inte att uppdatera konversationen',
}
