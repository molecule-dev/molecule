/** Translation keys for the ai-chat locale package. */
export type ChatTranslationKey =
  | 'chat.error.httpError'
  | 'chat.error.noResponseBody'
  | 'chat.error.streamError'
  | 'chat.error.unknownError'

/** Translation record mapping ai-chat keys to translated strings. */
export type ChatTranslations = Record<ChatTranslationKey, string>
