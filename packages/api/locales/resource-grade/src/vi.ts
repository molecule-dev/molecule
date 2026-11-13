import type { GradeTranslations } from './types.js'

/** Grade translations for Vietnamese. */
export const vi: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId và courseId là các thông tin bắt buộc.',
  'grade.error.scoreNumeric': 'scorePoints và maxPoints phải là các số.',
  'grade.error.maxPointsPositive': 'maxPoints phải lớn hơn không.',
  'grade.error.scoreOutOfRange': 'scorePoints phải nằm trong khoảng từ 0 đến maxPoints',
  'grade.error.createFailed': 'Không đăng được điểm',
  'grade.error.notFound': 'Không tìm thấy điểm số',
  'grade.error.readFailed': 'Không đọc được điểm',
  'grade.error.listFailed': 'Không liệt kê được điểm số',
  'grade.error.updateFailed': 'Không thể cập nhật điểm số',
  'grade.error.deleteFailed': 'Không thể xóa điểm',
  'grade.error.noGrades': 'Không tìm thấy điểm số nào.',
  'grade.error.courseAverageFailed': 'Không thể tính điểm trung bình môn học',
  'grade.error.gpaFailed': 'Không thể tính điểm trung bình (GPA).',
  'grade.error.transcriptFailed': 'Không thể tạo bản ghi',
}
