import type { GradeTranslations } from './types.js'

/** Grade translations for Indonesian. */
export const id: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId, dan courseId wajib diisi.',
  'grade.error.scoreNumeric': 'scorePoints dan maxPoints harus berupa angka.',
  'grade.error.maxPointsPositive': 'maxPoints harus lebih besar dari nol',
  'grade.error.scoreOutOfRange': 'Poin skor harus berada di antara 0 dan poin maksimum.',
  'grade.error.createFailed': 'Gagal mengunggah nilai.',
  'grade.error.notFound': 'Nilai tidak ditemukan',
  'grade.error.readFailed': 'Gagal membaca nilai',
  'grade.error.listFailed': 'Nilai tidak dicantumkan',
  'grade.error.updateFailed': 'Gagal memperbarui nilai',
  'grade.error.deleteFailed': 'Gagal menghapus nilai',
  'grade.error.noGrades': 'Tidak ditemukan nilai.',
  'grade.error.courseAverageFailed': 'Gagal menghitung rata-rata mata kuliah',
  'grade.error.gpaFailed': 'Gagal menghitung IPK',
  'grade.error.transcriptFailed': 'Gagal membuat transkrip.',
}
