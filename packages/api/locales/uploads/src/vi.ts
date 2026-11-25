import type { UploadsTranslations } from './types.js'

/** Uploads translations for Vietnamese. */
export const vi: UploadsTranslations = {
  'uploads.error.noProvider': 'Nhà cung cấp tải lên chưa được cấu hình. Gọi setProvider() trước.',
  'uploads.error.streamLimitReached': 'Đã đạt giới hạn luồng.',
  'uploads.error.aborted': 'Quá trình tải lên đã bị hủy.',
  'uploads.error.fileTypeBlocked': 'Không thể tải lên tệp thuộc loại {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() liệt kê {{type}}, một loại mà trình duyệt thực thi. Truyền allowActiveTypes: true để lưu trữ nó và phục vụ các tệp đó bằng sendUpload().',
}
