import type { GradeTranslations } from './types.js'

/** Grade translations for Spanish. */
export const es: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Se requieren los campos enrollmentId, assignmentId, userId y courseId.',
  'grade.error.scoreNumeric': 'scorePoints y maxPoints deben ser números',
  'grade.error.maxPointsPositive': 'maxPoints debe ser mayor que cero.',
  'grade.error.scoreOutOfRange': 'La puntuación debe estar entre 0 y maxPoints.',
  'grade.error.createFailed': 'No se pudo publicar la calificación',
  'grade.error.notFound': 'Calificación no encontrada',
  'grade.error.readFailed': 'No pudo leer la calificación',
  'grade.error.listFailed': 'No se pudieron incluir las calificaciones.',
  'grade.error.updateFailed': 'No se pudo actualizar la calificación',
  'grade.error.deleteFailed': 'No se pudo eliminar la calificación',
  'grade.error.noGrades': 'No se encontraron calificaciones',
  'grade.error.courseAverageFailed': 'No se pudo calcular el promedio del curso.',
  'grade.error.gpaFailed': 'No se pudo calcular el promedio de calificaciones.',
  'grade.error.transcriptFailed': 'No se pudo generar la transcripción',
}
