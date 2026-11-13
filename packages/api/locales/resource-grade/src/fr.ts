import type { GradeTranslations } from './types.js'

/** Grade translations for French. */
export const fr: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId et courseId sont obligatoires.',
  'grade.error.scoreNumeric': 'scorePoints et maxPoints doivent être des nombres',
  'grade.error.maxPointsPositive': 'maxPoints doit être supérieur à zéro',
  'grade.error.scoreOutOfRange': 'Le scorePoints doit être compris entre 0 et maxPoints.',
  'grade.error.createFailed': 'Échec de la publication de la note',
  'grade.error.notFound': 'Note introuvable',
  'grade.error.readFailed': 'Échec de la lecture de la note',
  'grade.error.listFailed': "Les notes n'ont pas été indiquées.",
  'grade.error.updateFailed': 'Échec de la mise à jour de la note',
  'grade.error.deleteFailed': 'Impossible de supprimer la note',
  'grade.error.noGrades': 'Aucune note trouvée',
  'grade.error.courseAverageFailed': 'Échec du calcul de la moyenne du cours',
  'grade.error.gpaFailed': 'Échec du calcul de la moyenne pondérée cumulative (GPA)',
  'grade.error.transcriptFailed': 'Échec de la génération de la transcription',
}
