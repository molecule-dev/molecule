import type { GradeTranslations } from './types.js'

/** Grade translations for Polish. */
export const pl: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'Wymagane są enrollmentId, assignmentId, userId i courseId',
  'grade.error.scoreNumeric': 'scorePoints i maxPoints muszą być liczbami',
  'grade.error.maxPointsPositive': 'maxPoints musi być większe od zera',
  'grade.error.scoreOutOfRange': 'scorePoints musi mieścić się w przedziale od 0 do maxPoints',
  'grade.error.createFailed': 'Nie udało się opublikować oceny',
  'grade.error.notFound': 'Nie znaleziono oceny',
  'grade.error.readFailed': 'Nie udało się odczytać oceny',
  'grade.error.listFailed': 'Nie udało się wyświetlić ocen',
  'grade.error.updateFailed': 'Nie udało się zaktualizować oceny',
  'grade.error.deleteFailed': 'Nie udało się usunąć oceny',
  'grade.error.noGrades': 'Nie znaleziono ocen',
  'grade.error.courseAverageFailed': 'Nie udało się obliczyć średniej za kurs',
  'grade.error.gpaFailed': 'Nie udało się obliczyć GPA',
  'grade.error.transcriptFailed': 'Nie udało się zbudować transkryptu',
}
