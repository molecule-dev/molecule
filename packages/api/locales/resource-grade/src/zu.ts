import type { GradeTranslations } from './types.js'

/** Grade translations for Zulu. */
export const zu: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'i-enrollmentId, i-assignmentId, i-userId, kanye ne-courseId kuyadingeka',
  'grade.error.scoreNumeric': 'Amaphuzu kanye namaphoyinti aphezulu kumele kube izinombolo',
  'grade.error.maxPointsPositive': 'Amaphoyinti aphezulu kumele abe ngaphezu kuka-zero',
  'grade.error.scoreOutOfRange': 'Amaphuzu e-score kumele abe phakathi kuka-0 no-maxPoints',
  'grade.error.createFailed': 'Yehlulekile ukuthumela ibanga',
  'grade.error.notFound': 'Ibanga alitholakalanga',
  'grade.error.readFailed': 'Yehlulekile ukufunda ibanga',
  'grade.error.listFailed': 'Yehlulekile ukufaka amamaki ohlwini',
  'grade.error.updateFailed': 'Yehlulekile ukubuyekeza ibanga',
  'grade.error.deleteFailed': 'Yehlulekile ukususa ibanga',
  'grade.error.noGrades': 'Awekho amamaki atholakele',
  'grade.error.courseAverageFailed': 'Yehlulekile ukubala isilinganiso sesifundo',
  'grade.error.gpaFailed': 'Yehlulekile ukubala i-GPA',
  'grade.error.transcriptFailed': 'Yehlulekile ukwakha umbhalo oqoshiwe',
}
