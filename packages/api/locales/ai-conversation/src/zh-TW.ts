import type { ConversationTranslations } from './types.js'

/** Conversation translations for Chinese (Traditional). */
export const zhTW: ConversationTranslations = {
  'conversation.error.messageRequired': '需要 message',
  'conversation.error.aiNotConfigured': 'AI 提供者未設定',
  'conversation.error.unknownAiError': '未知的 AI 錯誤',
  'conversation.error.notFound': '找不到對話',
  'conversation.error.streamError': 'AI 串流錯誤',
  'conversation.error.forbidden': '拒絕訪問',
  'conversation.error.unauthorized': '未經授權',
  'conversation.error.clearFailed': '未能澄清對話',
  'conversation.error.idRequired': '當項目包含多個對話時，需要提供 conversationId。',
  'conversation.error.historyFailed': '對話歷史記錄載入失敗',
  'conversation.error.readFailed': '未能閱讀對話',
  'conversation.error.updateFailed': '對話更新失敗',
}
