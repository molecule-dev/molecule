import type { GradeTranslations } from './types.js'

/** Grade translations for Galician. */
export const gl: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Son obrigatorios os valores enrollmentId, assignmentId, userId e courseId',
  'grade.error.scoreNumeric': 'scorePoints e maxPoints deben ser números',
  'grade.error.maxPointsPositive': 'maxPoints debe ser maior que cero',
  'grade.error.scoreOutOfRange': 'Os puntos de puntuación deben estar entre 0 e maxPoints',
  'grade.error.createFailed': 'Non se puido publicar a cualificación',
  'grade.error.notFound': 'Non se atopou a cualificación',
  'grade.error.readFailed': 'Non se puido ler a cualificación',
  'grade.error.listFailed': 'Non se puideron listar as cualificacións',
  'grade.error.updateFailed': 'Non se puido actualizar a cualificación',
  'grade.error.deleteFailed': 'Non se puido eliminar a cualificación',
  'grade.error.noGrades': 'Non se atoparon cualificacións',
  'grade.error.courseAverageFailed': 'Non se puido calcular a media do curso',
  'grade.error.gpaFailed': 'Non se puido calcular a media ponderada',
  'grade.error.transcriptFailed': 'Non se puido crear a transcrición',
}
