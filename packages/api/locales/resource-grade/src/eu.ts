import type { GradeTranslations } from './types.js'

/** Grade translations for Basque. */
export const eu: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId eta courseId beharrezkoak dira',
  'grade.error.scoreNumeric': 'scorePoints eta maxPoints zenbakiak izan behar dira',
  'grade.error.maxPointsPositive': 'maxPoints zero baino handiagoa izan behar da',
  'grade.error.scoreOutOfRange': 'puntuazioaPuntuak 0 eta maxPuntuen artean egon behar dira',
  'grade.error.createFailed': 'Kalifikazioa argitaratzea huts egin da',
  'grade.error.notFound': 'Ez da aurkitu kalifikazioa',
  'grade.error.readFailed': 'Ezin izan da nota irakurri',
  'grade.error.listFailed': 'Ezin izan dira kalifikazioak zerrendatu',
  'grade.error.updateFailed': 'Ezin izan da kalifikazioa eguneratu',
  'grade.error.deleteFailed': 'Ezin izan da nota ezabatu',
  'grade.error.noGrades': 'Ez da kalifikaziorik aurkitu',
  'grade.error.courseAverageFailed': 'Ikastaroaren batez bestekoa kalkulatzea huts egin du',
  'grade.error.gpaFailed': 'Ezin izan da GPA kalkulatu',
  'grade.error.transcriptFailed': 'Transkripzioa eraikitzea huts egin da',
}
