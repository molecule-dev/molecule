import type { GradeTranslations } from './types.js'

/** Grade translations for Latvian. */
export const lv: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Obligāti jānorāda reģistrācijas Id, uzdevuma Id, lietotāja Id un kursa Id.',
  'grade.error.scoreNumeric': 'Vērtībām scorePoints un maxPoints jābūt skaitļiem.',
  'grade.error.maxPointsPositive': 'maxPoints vērtībai jābūt lielākai par nulli',
  'grade.error.scoreOutOfRange': 'scorePoints vērtībai jābūt no 0 līdz maxPoints.',
  'grade.error.createFailed': 'Neizdevās publicēt atzīmi',
  'grade.error.notFound': 'Atzīme nav atrasta',
  'grade.error.readFailed': 'Neizdevās nolasīt atzīmi',
  'grade.error.listFailed': 'Neizdevās norādīt atzīmes',
  'grade.error.updateFailed': 'Neizdevās atjaunināt atzīmi',
  'grade.error.deleteFailed': 'Neizdevās dzēst atzīmi',
  'grade.error.noGrades': 'Nav atrastas atzīmes',
  'grade.error.courseAverageFailed': 'Neizdevās aprēķināt kursa vidējo vērtējumu.',
  'grade.error.gpaFailed': 'Neizdevās aprēķināt vidējo atzīmi',
  'grade.error.transcriptFailed': 'Neizdevās izveidot transkriptu',
}
