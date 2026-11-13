import type { AiTranslations } from './types.js'

/** Ai translations for Chinese (Traditional). */
export const zhTW: AiTranslations = {
  'ai.error.noProvider': 'AI 提供者未設定。請先綁定 AI 提供者。',
  'ai.error.ambiguousProvider':
    '已綁定多個具名的 AI 提供者，且未設定預設值。請使用 getProviderByName(name) 選擇一個。',
  'ai.error.responseIncomplete': 'AI回應尚未完成即結束，請重試。',
  'ai.error.responseTokenLimit': 'AI響應在完成前已達到輸出令牌限制。',
  'ai.error.apiError': 'AI服務出錯，請重試。',
  'ai.error.noResponseBody': '人工智慧服務沒有響應。',
}
