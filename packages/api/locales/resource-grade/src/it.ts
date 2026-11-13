import type { GradeTranslations } from './types.js'

/** Grade translations for Italian. */
export const it: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'sono richiesti enrollmentId, assignmentId, userId e courseId.',
  'grade.error.scoreNumeric': 'scorePoints e maxPoints devono essere numeri',
  'grade.error.maxPointsPositive': 'maxPoints deve essere maggiore di zero',
  'grade.error.scoreOutOfRange': 'scorePoints deve essere compreso tra 0 e maxPoints',
  'grade.error.createFailed': 'Non è stato possibile pubblicare il voto',
  'grade.error.notFound': 'Voto non trovato',
  'grade.error.readFailed': 'Impossibile leggere il voto',
  'grade.error.listFailed': 'Non è stato possibile elencare i voti.',
  'grade.error.updateFailed': 'Impossibile aggiornare il voto',
  'grade.error.deleteFailed': 'Impossibile eliminare il voto',
  'grade.error.noGrades': 'Nessun voto trovato',
  'grade.error.courseAverageFailed': 'Impossibile calcolare la media del corso',
  'grade.error.gpaFailed': 'Impossibile calcolare la media dei voti (GPA)',
  'grade.error.transcriptFailed': 'Impossibile creare la trascrizione',
}
