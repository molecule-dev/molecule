import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Vietnamese. */
export const vi: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Không có response body',
  'chat.error.streamError': 'Lỗi stream',
  'chat.error.unknownError': 'Lỗi không xác định',
  'chat.error.sendFailed': 'Không thể gửi tin nhắn',
  'chat.error.stalled':
    '{{agentName}} đã ngừng phản hồi. Quá trình có thể vẫn đang hoàn tất ở chế độ nền — hãy tải lại trang để xem thông tin mới nhất, hoặc gửi một tin nhắn mới.',
}
