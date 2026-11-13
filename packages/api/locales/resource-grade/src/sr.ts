import type { GradeTranslations } from './types.js'

/** Grade translations for Serbian. */
export const sr: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'Потребни су ИД уписа, ИД задатка, ИД корисника и ИД курса',
  'grade.error.scoreNumeric': 'scorePoints и maxPoints морају бити бројеви',
  'grade.error.maxPointsPositive': 'максимални број поена мора бити већи од нуле',
  'grade.error.scoreOutOfRange': 'scorePoints мора бити између 0 и maxPoints',
  'grade.error.createFailed': 'Постављање оцене није успело',
  'grade.error.notFound': 'Оцена није пронађена',
  'grade.error.readFailed': 'Није успело читање оцене',
  'grade.error.listFailed': 'Навођење оцена није успело',
  'grade.error.updateFailed': 'Ажурирање оцене није успело',
  'grade.error.deleteFailed': 'Брисање оцене није успело',
  'grade.error.noGrades': 'Није пронађена ниједна оцена',
  'grade.error.courseAverageFailed': 'Није успело израчунавање просека курса',
  'grade.error.gpaFailed': 'Није успело израчунавање просечне оцене',
  'grade.error.transcriptFailed': 'Није успело креирање транскрипта',
}
