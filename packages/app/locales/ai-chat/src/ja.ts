import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Japanese. */
export const ja: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'レスポンスボディがありません',
  'chat.error.streamError': 'ストリームエラー',
  'chat.error.unknownError': '不明なエラー',
  'chat.error.sendFailed': 'メッセージの送信に失敗しました',
  'chat.error.stalled':
    '{{agentName}}応答が停止しました。バックグラウンドで処理が完了する可能性もあります。最新の情報を確認するにはページを再読み込みするか、新しいメッセージを送信してください。',
}
