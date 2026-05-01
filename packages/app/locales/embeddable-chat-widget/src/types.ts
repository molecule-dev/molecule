/** Translation keys for the embeddable-chat-widget locale package. */
export type EmbeddableChatWidgetTranslationKey =
  | 'embeddableChatWidget.launcher.openLabel'
  | 'embeddableChatWidget.panel.headerLabel'
  | 'embeddableChatWidget.panel.closeLabel'
  | 'embeddableChatWidget.panel.emptyState'
  | 'embeddableChatWidget.panel.assistantTyping'
  | 'embeddableChatWidget.composer.placeholder'
  | 'embeddableChatWidget.composer.send'
  | 'embeddableChatWidget.error.streamError'

/** Translation record mapping embeddable-chat-widget keys to translated strings. */
export type EmbeddableChatWidgetTranslations = Record<EmbeddableChatWidgetTranslationKey, string>
