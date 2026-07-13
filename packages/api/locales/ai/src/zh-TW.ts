import type { AiTranslations } from './types.js'

/** Ai translations for Chinese (Traditional). */
export const zhTW: AiTranslations = {
  'ai.error.noProvider': 'AI 提供者未設定。請先綁定 AI 提供者。',
  'ai.error.apiError': 'AI API 請求失敗。',
  'ai.error.noResponseBody': 'AI 回應主體為空。',
  'ai.error.ambiguousProvider':
    '已綁定多個具名的 AI 提供者，且未設定預設值。請使用 getProviderByName(name) 選擇一個。',
}
