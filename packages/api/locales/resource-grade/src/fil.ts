import type { GradeTranslations } from './types.js'

/** Grade translations for Filipino. */
export const fil: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Kinakailangan ang enrollmentId, assignmentId, userId, at courseId',
  'grade.error.scoreNumeric': 'Dapat mga numero ang scorePoints at maxPoints',
  'grade.error.maxPointsPositive': 'Dapat mas malaki sa zero ang maxPoints',
  'grade.error.scoreOutOfRange': 'Ang mga scorePoints ay dapat nasa pagitan ng 0 at maxPoints',
  'grade.error.createFailed': 'Nabigong mag-post ng grado',
  'grade.error.notFound': 'Hindi natagpuan ang grado',
  'grade.error.readFailed': 'Hindi nabasa ang grado',
  'grade.error.listFailed': 'Hindi nailista ang mga grado',
  'grade.error.updateFailed': 'Nabigong i-update ang grado',
  'grade.error.deleteFailed': 'Nabigong tanggalin ang grado',
  'grade.error.noGrades': 'Walang nakitang marka',
  'grade.error.courseAverageFailed': 'Nabigong kalkulahin ang average ng kurso',
  'grade.error.gpaFailed': 'Nabigong kalkulahin ang GPA',
  'grade.error.transcriptFailed': 'Nabigong bumuo ng transcript',
}
