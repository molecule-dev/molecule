import type { GradeTranslations } from './types.js'

/** Grade translations for Malay. */
export const ms: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'ID pendaftaran, ID tugasan, ID pengguna dan ID kursus diperlukan',
  'grade.error.scoreNumeric': 'Mata skor dan Mata maksimum mestilah nombor',
  'grade.error.maxPointsPositive': 'maxPoints mesti lebih besar daripada sifar',
  'grade.error.scoreOutOfRange': 'Mata skor mestilah antara 0 dan Mata maksimum',
  'grade.error.createFailed': 'Gagal menghantar gred',
  'grade.error.notFound': 'Gred tidak ditemui',
  'grade.error.readFailed': 'Gagal membaca gred',
  'grade.error.listFailed': 'Gagal menyenaraikan gred',
  'grade.error.updateFailed': 'Gagal mengemas kini gred',
  'grade.error.deleteFailed': 'Gagal memadam gred',
  'grade.error.noGrades': 'Tiada gred ditemui',
  'grade.error.courseAverageFailed': 'Gagal mengira purata kursus',
  'grade.error.gpaFailed': 'Gagal mengira GPA',
  'grade.error.transcriptFailed': 'Gagal membina transkrip',
}
