import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Chinese (Traditional). */
export const zhTW: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': '無回應內容',
  'chat.error.streamError': '串流錯誤',
  'chat.error.unknownError': '未知錯誤',
  'chat.error.sendFailed': '訊息發送失敗',
  'chat.error.stalled':
    '{{agentName}}已停止回應。它可能仍在後台完成操作——請重新加載頁面以查看最新信息，或發送新消息。',
  'aiChat.error.noProvider': 'AI聊天服務提供者尚未配置。請先綁定AI聊天服務提供者。',
}
