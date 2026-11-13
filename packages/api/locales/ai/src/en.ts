import type { AiTranslations } from './types.js'

/** Ai translations for English. */
export const en: AiTranslations = {
  'ai.error.noProvider': 'AI provider not configured. Bond an AI provider first.',
  'ai.error.apiError': 'AI service error. Please try again.',
  'ai.error.noResponseBody': 'No response from AI service.',
  'ai.error.ambiguousProvider':
    'Multiple named AI providers are bonded and no default was set. Use getProviderByName(name) to select one.',
  'ai.error.responseIncomplete': 'AI response ended before completion. Please try again.',
  'ai.error.responseTokenLimit': 'AI response reached the output token limit before completion.',
}
