/** Translation keys for the message-bubble locale package. */
export type MessageBubbleTranslationKey =
  'composer.placeholder' | 'composer.send' | 'thread.replies_one' | 'thread.replies_other'

/**
 * Plural forms only some languages use — the CLDR categories beyond the
 * `one`/`other` pair, read by `t()` when the count selects them.
 */
export type MessageBubblePluralFormKey =
  'thread.replies_zero' | 'thread.replies_two' | 'thread.replies_few' | 'thread.replies_many'

/** Translation record mapping message-bubble-react keys to translated strings. */
export type MessageBubbleTranslations = Record<MessageBubbleTranslationKey, string> &
  Partial<Record<MessageBubblePluralFormKey, string>>
