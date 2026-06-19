import type { GradeTranslations } from './types.js'

/** Grade translations for Dutch. */
export const nl: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId, and courseId are required',
  'grade.error.scoreNumeric': 'scorePoints and maxPoints must be numbers',
  'grade.error.maxPointsPositive': 'maxPoints must be greater than zero',
  'grade.error.scoreOutOfRange': 'scorePoints must be between 0 and maxPoints',
  'grade.error.createFailed': 'Failed to post grade',
  'grade.error.notFound': 'Grade not found',
  'grade.error.readFailed': 'Failed to read grade',
  'grade.error.listFailed': 'Failed to list grades',
  'grade.error.updateFailed': 'Failed to update grade',
  'grade.error.deleteFailed': 'Failed to delete grade',
  'grade.error.noGrades': 'No grades found',
  'grade.error.courseAverageFailed': 'Failed to compute course average',
  'grade.error.gpaFailed': 'Failed to compute GPA',
  'grade.error.transcriptFailed': 'Failed to build transcript',
}
