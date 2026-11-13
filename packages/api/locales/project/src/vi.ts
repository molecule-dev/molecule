import type { ProjectTranslations } from './types.js'

/** Project translations for Vietnamese. */
export const vi: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Yêu cầu name và projectType',
  'project.error.notFound': 'Không tìm thấy',
  'project.error.forbidden': 'Quyền truy cập bị từ chối',
  'project.error.createFailed': 'Không thể tạo dự án',
  'project.error.invalidType':
    'Loại dự án không được hỗ trợ; dự kiến một trong các loại sau: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Không thể xóa dự án',
  'project.error.listFailed': 'Không thể liệt kê các dự án',
  'project.error.readFailed': 'Không thể đọc dự án',
  'project.error.updateFailed': 'Không thể cập nhật dự án',
}
