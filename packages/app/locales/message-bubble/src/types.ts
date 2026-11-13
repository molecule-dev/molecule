/** Translation keys for the message-bubble locale package. */
export type MessageBubbleTranslationKey =
  'composer.placeholder' | 'composer.send' | 'thread.replies_one' | 'thread.replies_other'

/** Translation record mapping message-bubble-react keys to translated strings. */
export type MessageBubbleTranslations = Record<MessageBubbleTranslationKey, string>
