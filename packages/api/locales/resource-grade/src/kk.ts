import type { GradeTranslations } from './types.js'

/** Grade translations for Kazakh. */
export const kk: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId және courseId міндетті түрде болуы керек',
  'grade.error.scoreNumeric': 'scorePoints және maxPoints сандар болуы керек',
  'grade.error.maxPointsPositive': 'maxPoints нөлден үлкен болуы керек',
  'grade.error.scoreOutOfRange': 'scorePoints 0 және maxPoints аралығында болуы керек',
  'grade.error.createFailed': 'Баға жарияланбады',
  'grade.error.notFound': 'Баға табылмады',
  'grade.error.readFailed': 'Бағаны оқу мүмкін болмады',
  'grade.error.listFailed': 'Бағалар тізімі жасалмады',
  'grade.error.updateFailed': 'Баға жаңартылмады',
  'grade.error.deleteFailed': 'Баға жойылмады',
  'grade.error.noGrades': 'Бағалар табылмады',
  'grade.error.courseAverageFailed': 'Курстың орташа мәні есептелмеді',
  'grade.error.gpaFailed': 'GPA есептеу сәтсіз аяқталды',
  'grade.error.transcriptFailed': 'Транскрипт жасалмады',
}
