import type { GradeTranslations } from './types.js'

/** Grade translations for Slovak. */
export const sk: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Položky enrollmentId, assignmentId, userId a courseId sú povinné.',
  'grade.error.scoreNumeric': 'scorePoints a maxPoints musia byť čísla',
  'grade.error.maxPointsPositive': 'maxPoints musí byť väčšie ako nula',
  'grade.error.scoreOutOfRange': 'Hodnota scorePoints musí byť medzi 0 a maxPoints',
  'grade.error.createFailed': 'Nepodarilo sa odoslať známku',
  'grade.error.notFound': 'Známka sa nenašla',
  'grade.error.readFailed': 'Nepodarilo sa prečítať známku',
  'grade.error.listFailed': 'Nepodarilo sa zobraziť zoznam známok',
  'grade.error.updateFailed': 'Nepodarilo sa aktualizovať známku',
  'grade.error.deleteFailed': 'Nepodarilo sa odstrániť známku',
  'grade.error.noGrades': 'Nenašli sa žiadne známky',
  'grade.error.courseAverageFailed': 'Nepodarilo sa vypočítať priemer kurzu',
  'grade.error.gpaFailed': 'Nepodarilo sa vypočítať GPA',
  'grade.error.transcriptFailed': 'Nepodarilo sa vytvoriť prepis',
}
