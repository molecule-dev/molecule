import type { ConversationTranslations } from './types.js'

/** Conversation translations for Dutch. */
export const nl: ConversationTranslations = {
  'conversation.error.messageRequired': 'bericht is vereist',
  'conversation.error.aiNotConfigured': 'AI-provider niet geconfigureerd',
  'conversation.error.unknownAiError': 'Onbekende AI-fout',
  'conversation.error.notFound': 'Geen gesprek gevonden',
  'conversation.error.streamError': 'AI-streamingfout',
  'conversation.error.forbidden': 'Toegang geweigerd',
  'conversation.error.unauthorized': 'Niet geautoriseerd',
  'conversation.error.clearFailed': 'Het gesprek is niet gelukt',
  'conversation.error.idRequired':
    'conversationId is vereist wanneer het project meer dan één gesprek bevat.',
  'conversation.error.historyFailed': 'Het laden van de gespreksgeschiedenis is mislukt.',
  'conversation.error.readFailed': 'Ik heb het gesprek niet kunnen lezen.',
  'conversation.error.updateFailed': 'Het bijwerken van het gesprek is mislukt.',
}
