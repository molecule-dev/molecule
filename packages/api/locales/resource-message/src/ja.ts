import type { MessageTranslations } from './types.js'

/** Message resource translations for Japanese. */
export const ja: MessageTranslations = {
  'message.error.deleteFailed': 'メッセージを削除できませんでした',
  'message.error.editFailed': 'メッセージを編集できませんでした',
  'message.error.listMessagesFailed': 'メッセージの一覧を取得できませんでした',
  'message.error.listThreadsFailed': 'スレッドの一覧を取得できませんでした',
  'message.error.markReadFailed': 'スレッドを既読にできませんでした',
  'message.error.messageNotFound': 'メッセージが見つからないか、編集できません',
  'message.error.missingMessageId': 'メッセージ ID が必要です',
  'message.error.missingThreadId': 'スレッド ID が必要です',
  'message.error.notParticipant': 'あなたはこのスレッドの参加者ではありません',
  'message.error.readThreadFailed': 'スレッドを読み取れませんでした',
  'message.error.selfThread': '自分自身とスレッドを開始することはできません',
  'message.error.sendFailed': 'メッセージを送信できませんでした',
  'message.error.threadCreateFailed': 'スレッドを作成できませんでした',
  'message.error.threadNotFound': 'スレッドが見つかりません',
  'message.error.unreadCountFailed': '未読数を取得できませんでした',
  'message.error.validationFailed': '検証に失敗しました',
  'message.system.conversationStarted': '{{name}} さんが会話を開始しました',
  'message.system.messageDeleted': 'このメッセージは削除されました',
}
