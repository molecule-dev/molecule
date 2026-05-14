import type { MessageTranslations } from './types.js'

/** Message resource translations for Chinese. */
export const zh: MessageTranslations = {
  'message.error.deleteFailed': '删除消息失败',
  'message.error.editFailed': '编辑消息失败',
  'message.error.listMessagesFailed': '列出消息失败',
  'message.error.listThreadsFailed': '列出会话失败',
  'message.error.markReadFailed': '将会话标记为已读失败',
  'message.error.messageNotFound': '未找到消息或无法编辑',
  'message.error.missingMessageId': '需要消息 ID',
  'message.error.missingThreadId': '需要会话 ID',
  'message.error.notParticipant': '您不是此会话的参与者',
  'message.error.readThreadFailed': '读取会话失败',
  'message.error.selfThread': '无法与自己开始会话',
  'message.error.sendFailed': '发送消息失败',
  'message.error.threadCreateFailed': '创建会话失败',
  'message.error.threadNotFound': '未找到会话',
  'message.error.unreadCountFailed': '获取未读数量失败',
  'message.error.validationFailed': '验证失败',
  'message.system.conversationStarted': '{{name}} 发起了一个会话',
  'message.system.messageDeleted': '此消息已删除',
}
