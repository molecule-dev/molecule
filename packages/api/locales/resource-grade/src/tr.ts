import type { GradeTranslations } from './types.js'

/** Grade translations for Turkish. */
export const tr: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId ve courseId zorunludur.',
  'grade.error.scoreNumeric': 'scorePoints ve maxPoints sayısal değerler olmalıdır.',
  'grade.error.maxPointsPositive': 'maxPoints sıfırdan büyük olmalıdır.',
  'grade.error.scoreOutOfRange': 'scorePoints değeri 0 ile maxPoints arasında olmalıdır.',
  'grade.error.createFailed': 'Notu gönderemedi.',
  'grade.error.notFound': 'Not bulunamadı',
  'grade.error.readFailed': 'Notu okuyamadı',
  'grade.error.listFailed': 'Notları listelemek mümkün olmadı.',
  'grade.error.updateFailed': 'Not güncellemesi başarısız oldu.',
  'grade.error.deleteFailed': 'Not silme işlemi başarısız oldu.',
  'grade.error.noGrades': 'Not bulunamadı.',
  'grade.error.courseAverageFailed': 'Ders ortalaması hesaplanamadı.',
  'grade.error.gpaFailed': 'Not ortalaması hesaplanamadı.',
  'grade.error.transcriptFailed': 'Transkript oluşturulamadı.',
}
