import type { GradeTranslations } from './types.js'

/** Grade translations for Russian. */
export const ru: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Идентификаторы enrollmentId, assignmentId, userId и courseId обязательны для заполнения.',
  'grade.error.scoreNumeric': 'Параметры scorePoints и maxPoints должны быть числами.',
  'grade.error.maxPointsPositive': 'maxPoints должно быть больше нуля.',
  'grade.error.scoreOutOfRange':
    'Значение scorePoints должно находиться в диапазоне от 0 до maxPoints.',
  'grade.error.createFailed': 'Не удалось выставить оценку',
  'grade.error.notFound': 'Оценка не найдена',
  'grade.error.readFailed': 'Не смог прочитать оценку',
  'grade.error.listFailed': 'Не указал оценки',
  'grade.error.updateFailed': 'Не удалось обновить оценку',
  'grade.error.deleteFailed': 'Не удалось удалить оценку',
  'grade.error.noGrades': 'Оценки не найдены',
  'grade.error.courseAverageFailed': 'Не удалось рассчитать средний балл по курсу.',
  'grade.error.gpaFailed': 'Не удалось рассчитать средний балл успеваемости.',
  'grade.error.transcriptFailed': 'Не удалось составить стенограмму.',
}
