/** Translation keys for the conversation locale package. */
export type ConversationTranslationKey =
  | 'conversation.error.messageRequired'
  | 'conversation.error.aiNotConfigured'
  | 'conversation.error.unknownAiError'
  | 'conversation.error.notFound'
  | 'conversation.error.streamError'
  | 'conversation.error.forbidden'
  | 'conversation.error.unauthorized'
  | 'conversation.error.clearFailed'
  | 'conversation.error.idRequired'
  | 'conversation.error.historyFailed'
  | 'conversation.error.readFailed'
  | 'conversation.error.updateFailed'

/** Translation record mapping conversation keys to translated strings. */
export type ConversationTranslations = Record<ConversationTranslationKey, string>
