import type { GradeTranslations } from './types.js'

/** Grade translations for Uzbek. */
export const uz: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId va courseId talab qilinadi',
  'grade.error.scoreNumeric': "scorePoints va maxPoints raqamlar bo'lishi kerak",
  'grade.error.maxPointsPositive': "maxPoints noldan katta bo'lishi kerak",
  'grade.error.scoreOutOfRange': "scorePoints 0 va maxPoints orasida bo'lishi kerak",
  'grade.error.createFailed': "Baho qo'yishda xatolik yuz berdi",
  'grade.error.notFound': 'Baho topilmadi',
  'grade.error.readFailed': "Bahoni o'qishda xatolik yuz berdi",
  'grade.error.listFailed': "Baholarni ro'yxatga kiritishda xatolik yuz berdi",
  'grade.error.updateFailed': 'Baho yangilanmadi',
  'grade.error.deleteFailed': 'Bahoni oʻchirishda xatolik yuz berdi',
  'grade.error.noGrades': 'Hech qanday baho topilmadi',
  'grade.error.courseAverageFailed': "Kurs o'rtacha qiymatini hisoblab bo'lmadi",
  'grade.error.gpaFailed': 'GPA hisoblanmadi',
  'grade.error.transcriptFailed': 'Transkript yaratilmadi',
}
