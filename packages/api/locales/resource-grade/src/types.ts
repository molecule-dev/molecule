/** Translation keys for the grade resource locale package. */
export type GradeTranslationKey =
  | 'grade.error.foreignKeysRequired'
  | 'grade.error.scoreNumeric'
  | 'grade.error.maxPointsPositive'
  | 'grade.error.scoreOutOfRange'
  | 'grade.error.createFailed'
  | 'grade.error.notFound'
  | 'grade.error.readFailed'
  | 'grade.error.listFailed'
  | 'grade.error.updateFailed'
  | 'grade.error.deleteFailed'
  | 'grade.error.noGrades'
  | 'grade.error.courseAverageFailed'
  | 'grade.error.gpaFailed'
  | 'grade.error.transcriptFailed'

/** Translation record mapping grade keys to translated strings. */
export type GradeTranslations = Record<GradeTranslationKey, string>
