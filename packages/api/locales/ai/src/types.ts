/** Translation keys for the ai locale package. */
export type AiTranslationKey =
  | 'ai.error.noProvider'
  | 'ai.error.apiError'
  | 'ai.error.noResponseBody'

/** Translation record mapping ai keys to translated strings. */
export type AiTranslations = Record<AiTranslationKey, string>
