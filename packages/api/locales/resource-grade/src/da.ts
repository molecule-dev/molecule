import type { GradeTranslations } from './types.js'

/** Grade translations for Danish. */
export const da: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'tilmeldings-ID, opgave-ID, bruger-ID og kursus-ID er påkrævede',
  'grade.error.scoreNumeric': 'scorePoints og maxPoints skal være tal',
  'grade.error.maxPointsPositive': 'maxPoints skal være større end nul',
  'grade.error.scoreOutOfRange': 'ScorePoints skal være mellem 0 og maxPoints',
  'grade.error.createFailed': 'Kunne ikke offentliggøre karakteren',
  'grade.error.notFound': 'Karakteren blev ikke fundet',
  'grade.error.readFailed': 'Kunne ikke læse karakteren',
  'grade.error.listFailed': 'Kunne ikke angive karakterer',
  'grade.error.updateFailed': 'Karakteren kunne ikke opdateres',
  'grade.error.deleteFailed': 'Karakteren kunne ikke slettes',
  'grade.error.noGrades': 'Ingen karakterer fundet',
  'grade.error.courseAverageFailed': 'Kunne ikke beregne kursusgennemsnittet',
  'grade.error.gpaFailed': 'Kunne ikke beregne GPA',
  'grade.error.transcriptFailed': 'Kunne ikke oprette en transskription',
}
