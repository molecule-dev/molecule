import type { GradeTranslations } from './types.js'

/** Grade translations for Ukrainian. */
export const uk: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    "Обов'язкові поля enrollmentId, assignmentId, userId та courseId",
  'grade.error.scoreNumeric': 'scorePoints та maxPoints мають бути числами',
  'grade.error.maxPointsPositive': 'maxPoints має бути більше нуля',
  'grade.error.scoreOutOfRange': 'Значення scorePoints має бути між 0 та maxPoints',
  'grade.error.createFailed': 'Не вдалося опублікувати оцінку',
  'grade.error.notFound': 'Оцінку не знайдено',
  'grade.error.readFailed': 'Не вдалося прочитати оцінку',
  'grade.error.listFailed': 'Не вдалося перерахувати оцінки',
  'grade.error.updateFailed': 'Не вдалося оновити оцінку',
  'grade.error.deleteFailed': 'Не вдалося видалити оцінку',
  'grade.error.noGrades': 'Оцінок не знайдено',
  'grade.error.courseAverageFailed': 'Не вдалося обчислити середнє значення курсу',
  'grade.error.gpaFailed': 'Не вдалося обчислити середній бал',
  'grade.error.transcriptFailed': 'Не вдалося створити транскрипт',
}
