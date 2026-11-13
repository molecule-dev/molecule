import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Chinese. */
export const zh: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': '无响应正文',
  'chat.error.streamError': '流式传输错误',
  'chat.error.unknownError': '未知错误',
  'chat.error.sendFailed': '消息发送失败',
  'chat.error.stalled':
    '{{agentName}}已停止响应。它可能仍在后台完成操作——请重新加载页面以查看最新信息，或发送新消息。',
  'aiChat.error.noProvider': 'AI聊天服务提供商尚未配置。请先绑定AI聊天服务提供商。',
}
