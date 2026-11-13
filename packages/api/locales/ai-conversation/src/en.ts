import type { ConversationTranslations } from './types.js'

/** Conversation translations for English. */
export const en: ConversationTranslations = {
  'conversation.error.messageRequired': 'message is required',
  'conversation.error.aiNotConfigured': 'AI provider not configured',
  'conversation.error.unknownAiError': 'Unknown AI error',
  'conversation.error.notFound': 'No conversation found',
  'conversation.error.streamError': 'AI streaming error',
  'conversation.error.forbidden': 'Access denied',
  'conversation.error.unauthorized': 'Unauthorized',
  'conversation.error.clearFailed': 'Failed to clear conversation',
  'conversation.error.idRequired':
    'conversationId is required when the project has more than one conversation',
  'conversation.error.historyFailed': 'Failed to load conversation history',
  'conversation.error.readFailed': 'Failed to read conversation',
  'conversation.error.updateFailed': 'Failed to update conversation',
}
