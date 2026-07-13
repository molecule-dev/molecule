import type { AiTranslations } from './types.js'

/** Ai translations for English. */
export const en: AiTranslations = {
  'ai.error.noProvider': 'AI provider not configured. Bond an AI provider first.',
  'ai.error.apiError': 'AI API request failed.',
  'ai.error.noResponseBody': 'AI response body is empty.',
  'ai.error.ambiguousProvider':
    'Multiple named AI providers are bonded and no default was set. Use getProviderByName(name) to select one.',
}
