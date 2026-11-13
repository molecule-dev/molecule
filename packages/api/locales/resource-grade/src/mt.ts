import type { GradeTranslations } from './types.js'

/** Grade translations for Maltese. */
export const mt: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId, u courseId huma meħtieġa',
  'grade.error.scoreNumeric': 'scorePoints u maxPoints iridu jkunu numri',
  'grade.error.maxPointsPositive': 'maxPoints irid ikun akbar minn żero',
  'grade.error.scoreOutOfRange': 'scorePoints irid ikun bejn 0 u maxPoints',
  'grade.error.createFailed': 'Ma rnexxiliex tibgħat il-grad',
  'grade.error.notFound': 'Grad mhux misjub',
  'grade.error.readFailed': 'Ma rnexxiliex naqra l-grad',
  'grade.error.listFailed': 'Ma rnexxiliex niżżel il-gradi',
  'grade.error.updateFailed': 'Ma rnexxiex naġġorna l-grad',
  'grade.error.deleteFailed': 'Ma rnexxiex tħassar il-grad',
  'grade.error.noGrades': 'Ma nstabu l-ebda gradi',
  'grade.error.courseAverageFailed': 'Ma rnexxiliex tikkalkula l-medja tal-kors',
  'grade.error.gpaFailed': 'Ma rnexxiliex tikkalkula l-GPA',
  'grade.error.transcriptFailed': 'Ma rnexxiliex tinbena t-traskrizzjoni',
}
