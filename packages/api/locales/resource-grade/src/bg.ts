import type { GradeTranslations } from './types.js'

/** Grade translations for Bulgarian. */
export const bg: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Задължителни са enrollmentId, assignmentId, userId и courseId',
  'grade.error.scoreNumeric': 'scorePoints и maxPoints трябва да са числа',
  'grade.error.maxPointsPositive': 'maxPoints трябва да е по-голямо от нула',
  'grade.error.scoreOutOfRange': 'scorePoints трябва да е между 0 и maxPoints',
  'grade.error.createFailed': 'Публикуването на оценката не бе успешно',
  'grade.error.notFound': 'Оценката не е намерена',
  'grade.error.readFailed': 'Неуспешно четене на оценката',
  'grade.error.listFailed': 'Изброяването на оценките не бе успешно',
  'grade.error.updateFailed': 'Актуализирането на оценката не бе успешно',
  'grade.error.deleteFailed': 'Изтриването на оценката не бе успешно',
  'grade.error.noGrades': 'Няма намерени оценки',
  'grade.error.courseAverageFailed': 'Неуспешно изчисляване на средната стойност на курса',
  'grade.error.gpaFailed': 'Неуспешно изчисляване на средния успех',
  'grade.error.transcriptFailed': 'Създаването на препис не бе успешно',
}
