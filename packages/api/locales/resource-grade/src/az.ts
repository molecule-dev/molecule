import type { GradeTranslations } from './types.js'

/** Grade translations for Azerbaijani. */
export const az: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId və courseId tələb olunur',
  'grade.error.scoreNumeric': 'scorePoints və maxPoints ədəd olmalıdır',
  'grade.error.maxPointsPositive': 'maxPoints sıfırdan böyük olmalıdır',
  'grade.error.scoreOutOfRange': 'scorePoints 0 ilə maxPoints arasında olmalıdır',
  'grade.error.createFailed': 'Qiyməti paylaşmaq alınmadı',
  'grade.error.notFound': 'Qiymət tapılmadı',
  'grade.error.readFailed': 'Qiyməti oxumaq alınmadı',
  'grade.error.listFailed': 'Qiymətləri sadalamaq alınmadı',
  'grade.error.updateFailed': 'Qiyməti yeniləmək alınmadı',
  'grade.error.deleteFailed': 'Qiyməti silmək alınmadı',
  'grade.error.noGrades': 'Qiymətlər tapılmadı',
  'grade.error.courseAverageFailed': 'Kurs ortalamasını hesablamaq alınmadı',
  'grade.error.gpaFailed': 'GPA hesablana bilmədi',
  'grade.error.transcriptFailed': 'Transkript yaradıla bilmədi',
}
