import type { AiTranslations } from './types.js'

/** Ai translations for Japanese. */
export const ja: AiTranslations = {
  'ai.error.noProvider':
    'AIプロバイダーが設定されていません。先にAIプロバイダーをボンドしてください。',
  'ai.error.ambiguousProvider':
    '複数の名前付きAIプロバイダーがボンドされており、デフォルトが設定されていません。getProviderByName(name)を使用して1つを選択してください。',
  'ai.error.responseIncomplete': 'AIの応答が完了する前に終了しました。もう一度お試しください。',
  'ai.error.responseTokenLimit': 'AIの応答が完了する前に、出力トークンの上限に達しました。',
  'ai.error.apiError': 'AIサービスでエラーが発生しました。もう一度お試しください。',
  'ai.error.noResponseBody': 'AIサービスからの応答なし。',
}
