import type { GradeTranslations } from './types.js'

/** Grade translations for Mongolian. */
export const mn: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId болон courseId шаардлагатай',
  'grade.error.scoreNumeric': 'scorePoints болон maxPoints нь тоо байх ёстой',
  'grade.error.maxPointsPositive': 'maxPoints нь тэгээс их байх ёстой',
  'grade.error.scoreOutOfRange': 'scorePoints нь 0 болон maxPoints хооронд байх ёстой',
  'grade.error.createFailed': 'Дүн нийтэлж чадсангүй',
  'grade.error.notFound': 'Дүн олдсонгүй',
  'grade.error.readFailed': 'Дүнг уншиж чадсангүй',
  'grade.error.listFailed': 'Дүнг жагсаахад алдаа гарлаа',
  'grade.error.updateFailed': 'Дүнг шинэчилж чадсангүй',
  'grade.error.deleteFailed': 'Дүнг устгаж чадсангүй',
  'grade.error.noGrades': 'Дүн олдсонгүй',
  'grade.error.courseAverageFailed': 'Хичээлийн дундажийг тооцоолж чадсангүй',
  'grade.error.gpaFailed': 'Голч дүнг тооцоолж чадсангүй',
  'grade.error.transcriptFailed': 'Транскрипт бүтээж чадсангүй',
}
