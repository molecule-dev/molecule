import type { ConversationTranslations } from './types.js'

/** Conversation translations for Vietnamese. */
export const vi: ConversationTranslations = {
  'conversation.error.messageRequired': 'Yêu cầu message',
  'conversation.error.aiNotConfigured': 'AI provider chưa được cấu hình',
  'conversation.error.unknownAiError': 'Lỗi AI không xác định',
  'conversation.error.notFound': 'Không tìm thấy cuộc hội thoại',
  'conversation.error.streamError': 'Lỗi AI streaming',
  'conversation.error.forbidden': 'Quyền truy cập bị từ chối',
  'conversation.error.unauthorized': 'Không được phép',
  'conversation.error.clearFailed': 'Không thể kết thúc cuộc trò chuyện',
  'conversation.error.idRequired':
    'conversationId là bắt buộc khi dự án có nhiều hơn một cuộc hội thoại.',
  'conversation.error.historyFailed': 'Không thể tải lịch sử cuộc trò chuyện',
  'conversation.error.readFailed': 'Không hiểu được cuộc hội thoại',
  'conversation.error.updateFailed': 'Không thể cập nhật cuộc trò chuyện',
}
