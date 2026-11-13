/** Translation keys for the ai-copilot locale package. */
export type AiCopilotTranslationKey =
  | 'copilot.error.httpError'
  | 'copilot.error.noResponseBody'
  | 'copilot.error.streamError'
  | 'copilot.error.unknownError'

/** Translation record mapping `@molecule/app-ai-copilot` keys to translated strings. */
export type AiCopilotTranslations = Record<AiCopilotTranslationKey, string>
