import type { GradeTranslations } from './types.js'

/** Grade translations for Romanian. */
export const ro: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId și courseId sunt obligatorii',
  'grade.error.scoreNumeric': 'scorePoints și maxPoints trebuie să fie numere',
  'grade.error.maxPointsPositive': 'maxPoints trebuie să fie mai mare decât zero',
  'grade.error.scoreOutOfRange': 'scorePoints trebuie să fie între 0 și maxPoints',
  'grade.error.createFailed': 'Nu s-a putut posta nota',
  'grade.error.notFound': 'Nota nu a fost găsită',
  'grade.error.readFailed': 'Nu s-a putut citi nota',
  'grade.error.listFailed': 'Nu s-au putut lista notele',
  'grade.error.updateFailed': 'Nu s-a putut actualiza nota',
  'grade.error.deleteFailed': 'Nu s-a putut șterge nota',
  'grade.error.noGrades': 'Nu s-au găsit note',
  'grade.error.courseAverageFailed': 'Nu s-a putut calcula media cursului',
  'grade.error.gpaFailed': 'Nu s-a putut calcula media generală (GPA)',
  'grade.error.transcriptFailed': 'Nu s-a putut crea transcrierea',
}
