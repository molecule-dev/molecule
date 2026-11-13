import type { GradeTranslations } from './types.js'

/** Grade translations for Arabic. */
export const ar: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'مطلوب كل من enrollmentId و assignmentId و userId و courseId',
  'grade.error.scoreNumeric': 'يجب أن تكون قيمتا scorePoints و maxPoints أرقامًا.',
  'grade.error.maxPointsPositive': 'يجب أن تكون قيمة maxPoints أكبر من الصفر',
  'grade.error.scoreOutOfRange': 'يجب أن تكون نقاط التقييم بين 0 و maxPoints',
  'grade.error.createFailed': 'فشل في نشر الدرجة',
  'grade.error.notFound': 'لم يتم العثور على الدرجة',
  'grade.error.readFailed': 'فشل في قراءة الدرجة',
  'grade.error.listFailed': 'لم يتم إدراج الدرجات',
  'grade.error.updateFailed': 'فشل تحديث الدرجة',
  'grade.error.deleteFailed': 'فشل حذف الدرجة',
  'grade.error.noGrades': 'لم يتم العثور على أي درجات',
  'grade.error.courseAverageFailed': 'فشل في حساب متوسط درجات المقرر',
  'grade.error.gpaFailed': 'فشل في حساب المعدل التراكمي',
  'grade.error.transcriptFailed': 'فشل إنشاء النص',
}
