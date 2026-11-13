import type { GradeTranslations } from './types.js'

/** Grade translations for Kyrgyz. */
export const ky: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId жана courseId талап кылынат',
  'grade.error.scoreNumeric': 'scorePoints жана maxPoints сандар болушу керек',
  'grade.error.maxPointsPositive': 'maxPoints нөлдөн чоң болушу керек',
  'grade.error.scoreOutOfRange': 'scorePoints 0 жана maxPoints ортосунда болушу керек',
  'grade.error.createFailed': 'Баа жарыяланган жок',
  'grade.error.notFound': 'Баа табылган жок',
  'grade.error.readFailed': 'Баа окулбай калды',
  'grade.error.listFailed': 'Баалардын тизмеси түзүлбөй калды',
  'grade.error.updateFailed': 'Баа жаңыртылбай калды',
  'grade.error.deleteFailed': 'Баа өчүрүлгөн жок',
  'grade.error.noGrades': 'Баалар табылган жок',
  'grade.error.courseAverageFailed': 'Курстун орточо көрсөткүчү эсептелбей калды',
  'grade.error.gpaFailed': 'GPA эсептелбей калды',
  'grade.error.transcriptFailed': 'Транскрипт түзүлбөй калды',
}
