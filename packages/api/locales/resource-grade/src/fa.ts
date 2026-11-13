import type { GradeTranslations } from './types.js'

/** Grade translations for Persian. */
export const fa: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'شناسه‌های ثبت نام (enrollmentId)، شناسه تخصیص (assignmentId)، شناسه کاربر (userId) و شناسه دوره (courseId) الزامی هستند.',
  'grade.error.scoreNumeric':
    'امتیازها (scorePoints) و حداکثر امتیازها (maxPoints) باید عدد باشند.',
  'grade.error.maxPointsPositive': 'maxPoints باید بزرگتر از صفر باشد.',
  'grade.error.scoreOutOfRange': 'امتیاز امتیاز باید بین 0 و حداکثر امتیاز باشد',
  'grade.error.createFailed': 'ثبت نمره انجام نشد',
  'grade.error.notFound': 'درجه یافت نشد',
  'grade.error.readFailed': 'نمره خوانده نشد',
  'grade.error.listFailed': 'نمرات ثبت نشدند',
  'grade.error.updateFailed': 'به‌روزرسانی نمره انجام نشد',
  'grade.error.deleteFailed': 'حذف نمره انجام نشد',
  'grade.error.noGrades': 'هیچ نمره‌ای یافت نشد',
  'grade.error.courseAverageFailed': 'میانگین دروس محاسبه نشد',
  'grade.error.gpaFailed': 'محاسبه معدل ناموفق بود',
  'grade.error.transcriptFailed': 'ساخت رونوشت ناموفق بود',
}
