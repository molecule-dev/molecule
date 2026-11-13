import type { GradeTranslations } from './types.js'

/** Grade translations for Catalan. */
export const ca: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Els valors enrollmentId, assignmentId, userId i courseId són obligatoris.',
  'grade.error.scoreNumeric': 'scorePoints i maxPoints han de ser números',
  'grade.error.maxPointsPositive': 'maxPoints ha de ser més gran que zero',
  'grade.error.scoreOutOfRange': "scorePoints ha d'estar entre 0 i maxPoints",
  'grade.error.createFailed': "No s'ha pogut publicar la nota",
  'grade.error.notFound': "No s'ha trobat la nota",
  'grade.error.readFailed': "No s'ha pogut llegir la nota",
  'grade.error.listFailed': "No s'han pogut llistar les qualificacions",
  'grade.error.updateFailed': "No s'ha pogut actualitzar la nota",
  'grade.error.deleteFailed': "No s'ha pogut suprimir la nota",
  'grade.error.noGrades': "No s'han trobat qualificacions",
  'grade.error.courseAverageFailed': "No s'ha pogut calcular la mitjana del curs",
  'grade.error.gpaFailed': "No s'ha pogut calcular el GPA",
  'grade.error.transcriptFailed': "No s'ha pogut crear la transcripció",
}
