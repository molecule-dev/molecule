import type { TrashTranslations } from './types.js'

/** Trash translations for Vietnamese. */
export const vi: TrashTranslations = {
  'trash.error.alreadyResolved': 'Mục đã xóa đã được khôi phục hoặc xóa vĩnh viễn',
  'trash.error.countFailed': 'Không thể đếm các mục đã xóa',
  'trash.error.listFailed': 'Không thể liệt kê các mục đã xóa',
  'trash.error.missingId': 'Cần có ID thùng rác',
  'trash.error.missingResource': 'Cần có loại và ID tài nguyên',
  'trash.error.notFound': 'Không tìm thấy mục đã xóa',
  'trash.error.noRestoreHandler':
    'Không có trình xử lý khôi phục nào được đăng ký cho loại tài nguyên này',
  'trash.error.purgeFailed': 'Không thể xóa vĩnh viễn mục đã xóa',
  'trash.error.readFailed': 'Không thể đọc mục đã xóa',
  'trash.error.restoreFailed': 'Không thể khôi phục mục đã xóa',
  'trash.error.trashFailed': 'Không thể chuyển mục vào thùng rác',
  'trash.error.validationFailed': 'Xác thực không thành công',
}
