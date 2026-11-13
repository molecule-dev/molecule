import type { ConversationTranslations } from './types.js'

/** Conversation translations for Japanese. */
export const ja: ConversationTranslations = {
  'conversation.error.messageRequired': 'messageは必須です',
  'conversation.error.aiNotConfigured': 'AIプロバイダーが設定されていません',
  'conversation.error.unknownAiError': '不明なAIエラー',
  'conversation.error.notFound': '会話が見つかりません',
  'conversation.error.streamError': 'AIストリーミングエラー',
  'conversation.error.forbidden': 'アクセスが拒否されました',
  'conversation.error.unauthorized': '許可されていない',
  'conversation.error.clearFailed': '会話をクリアできませんでした',
  'conversation.error.idRequired':
    'プロジェクトに複数の会話がある場合、conversationId は必須です。',
  'conversation.error.historyFailed': '会話履歴の読み込みに失敗しました',
  'conversation.error.readFailed': '会話の読み取りに失敗しました',
  'conversation.error.updateFailed': '会話の更新に失敗しました',
}
