import type { ConversationTranslations } from './types.js'

/** Conversation translations for Chinese. */
export const zh: ConversationTranslations = {
  'conversation.error.messageRequired': '需要 message',
  'conversation.error.aiNotConfigured': 'AI 提供程序未配置',
  'conversation.error.unknownAiError': '未知的 AI 错误',
  'conversation.error.notFound': '未找到对话',
  'conversation.error.streamError': 'AI 流式传输错误',
  'conversation.error.forbidden': '拒绝访问',
  'conversation.error.unauthorized': '未经授权',
  'conversation.error.clearFailed': '未能澄清对话',
  'conversation.error.idRequired': '当项目包含多个对话时，需要提供 conversationId。',
  'conversation.error.historyFailed': '对话历史记录加载失败',
  'conversation.error.readFailed': '未能阅读对话',
  'conversation.error.updateFailed': '对话更新失败',
}
