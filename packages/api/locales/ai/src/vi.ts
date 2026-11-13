import type { AiTranslations } from './types.js'

/** Ai translations for Vietnamese. */
export const vi: AiTranslations = {
  'ai.error.noProvider': 'Nhà cung cấp AI chưa được cấu hình. Hãy liên kết nhà cung cấp AI trước.',
  'ai.error.ambiguousProvider':
    'Nhiều nhà cung cấp AI có tên đã được liên kết và chưa thiết lập mặc định. Sử dụng getProviderByName(name) để chọn một.',
  'ai.error.responseIncomplete': 'Phản hồi của AI kết thúc trước khi hoàn tất. Vui lòng thử lại.',
  'ai.error.responseTokenLimit':
    'Phản hồi của AI đã đạt đến giới hạn số lượng token đầu ra trước khi hoàn thành.',
  'ai.error.apiError': 'Lỗi dịch vụ AI. Vui lòng thử lại.',
  'ai.error.noResponseBody': 'Không nhận được phản hồi từ dịch vụ AI.',
}
