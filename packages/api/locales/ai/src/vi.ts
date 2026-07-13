import type { AiTranslations } from './types.js'

/** Ai translations for Vietnamese. */
export const vi: AiTranslations = {
  'ai.error.noProvider': 'Nhà cung cấp AI chưa được cấu hình. Hãy liên kết nhà cung cấp AI trước.',
  'ai.error.apiError': 'Yêu cầu API AI thất bại.',
  'ai.error.noResponseBody': 'Nội dung phản hồi AI trống.',
  'ai.error.ambiguousProvider':
    'Nhiều nhà cung cấp AI có tên đã được liên kết và chưa thiết lập mặc định. Sử dụng getProviderByName(name) để chọn một.',
}
