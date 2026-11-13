import type { GradeTranslations } from './types.js'

/** Grade translations for Slovenian. */
export const sl: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Polja za vpis (enrollmentId), nalogo (assignmentId), uporabniško ime (userId) in predmet (courseId) so obvezna.',
  'grade.error.scoreNumeric': 'scorePoints in maxPoints morata biti številki',
  'grade.error.maxPointsPositive': 'maxPoints mora biti večje od nič',
  'grade.error.scoreOutOfRange': 'Število točk mora biti med 0 in maxPoints',
  'grade.error.createFailed': 'Objava ocene ni uspela',
  'grade.error.notFound': 'Ocena ni bila najdena',
  'grade.error.readFailed': 'Ocene ni bilo mogoče prebrati',
  'grade.error.listFailed': 'Seznam ocen ni uspel',
  'grade.error.updateFailed': 'Ocene ni bilo mogoče posodobiti',
  'grade.error.deleteFailed': 'Ocene ni bilo mogoče izbrisati',
  'grade.error.noGrades': 'Ni najdenih ocen',
  'grade.error.courseAverageFailed': 'Izračun povprečja tečaja ni uspel',
  'grade.error.gpaFailed': 'Izračun povprečne ocene ni uspel',
  'grade.error.transcriptFailed': 'Prepisa ni bilo mogoče ustvariti',
}
