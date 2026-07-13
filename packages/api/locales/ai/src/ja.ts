import type { AiTranslations } from './types.js'

/** Ai translations for Japanese. */
export const ja: AiTranslations = {
  'ai.error.noProvider':
    'AIプロバイダーが設定されていません。先にAIプロバイダーをボンドしてください。',
  'ai.error.apiError': 'AI APIリクエストが失敗しました。',
  'ai.error.noResponseBody': 'AIレスポンスボディが空です。',
  'ai.error.ambiguousProvider':
    '複数の名前付きAIプロバイダーがボンドされており、デフォルトが設定されていません。getProviderByName(name)を使用して1つを選択してください。',
}
