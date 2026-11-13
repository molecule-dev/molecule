import type { GradeTranslations } from './types.js'

/** Grade translations for Macedonian. */
export const mk: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'задолжителни се enrollmentId, assignmentId, userId и courseId',
  'grade.error.scoreNumeric': 'scorePoints и maxPoints мора да бидат броеви',
  'grade.error.maxPointsPositive': 'maxPoints мора да биде поголем од нула',
  'grade.error.scoreOutOfRange': 'scorePoints мора да биде помеѓу 0 и maxPoints',
  'grade.error.createFailed': 'Неуспешно објавување на оценката',
  'grade.error.notFound': 'Оцената не е пронајдена',
  'grade.error.readFailed': 'Не успеав да ја прочитам оценката',
  'grade.error.listFailed': 'Не успеа да се наведат оценките',
  'grade.error.updateFailed': 'Неуспешно ажурирање на оценката',
  'grade.error.deleteFailed': 'Неуспешно бришење на оценката',
  'grade.error.noGrades': 'Не се пронајдени оценки',
  'grade.error.courseAverageFailed': 'Не успеа да се пресмета просекот на курсот',
  'grade.error.gpaFailed': 'Не успеа да се пресмета просекот на оценки',
  'grade.error.transcriptFailed': 'Не успеа да се изгради транскрипт',
}
