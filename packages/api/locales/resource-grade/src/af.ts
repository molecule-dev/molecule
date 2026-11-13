import type { GradeTranslations } from './types.js'

/** Grade translations for Afrikaans. */
export const af: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'inskrywings-ID, opdrag-ID, gebruikers-ID en kursus-ID word vereis',
  'grade.error.scoreNumeric': 'puntetelling en maksimum punte moet getalle wees',
  'grade.error.maxPointsPositive': 'maksPunte moet groter as nul wees',
  'grade.error.scoreOutOfRange': 'Punte moet tussen 0 en maksimumpunte wees',
  'grade.error.createFailed': 'Kon nie punt plaas nie',
  'grade.error.notFound': 'Graad nie gevind nie',
  'grade.error.readFailed': 'Kon nie punt lees nie',
  'grade.error.listFailed': 'Kon nie grade lys nie',
  'grade.error.updateFailed': 'Kon nie graad opdateer nie',
  'grade.error.deleteFailed': 'Kon nie graad uitvee nie',
  'grade.error.noGrades': 'Geen punte gevind nie',
  'grade.error.courseAverageFailed': 'Kon nie kursusgemiddelde bereken nie',
  'grade.error.gpaFailed': 'Kon nie GPA bereken nie',
  'grade.error.transcriptFailed': 'Kon nie transkripsie bou nie',
}
