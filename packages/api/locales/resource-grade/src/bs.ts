import type { GradeTranslations } from './types.js'

/** Grade translations for Bosnian. */
export const bs: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'Obavezni su ID upisa, ID zadatka, ID korisnika i ID kursa',
  'grade.error.scoreNumeric': 'scorePoints i maxPoints moraju biti brojevi',
  'grade.error.maxPointsPositive': 'maxPoints mora biti veći od nule',
  'grade.error.scoreOutOfRange': 'Broj bodova mora biti između 0 i maksimalnog broja bodova',
  'grade.error.createFailed': 'Objavljivanje ocjene nije uspjelo',
  'grade.error.notFound': 'Ocjena nije pronađena',
  'grade.error.readFailed': 'Nije moguće pročitati ocjenu',
  'grade.error.listFailed': 'Nije uspjelo navođenje ocjena',
  'grade.error.updateFailed': 'Ažuriranje ocjene nije uspjelo',
  'grade.error.deleteFailed': 'Brisanje ocjene nije uspjelo',
  'grade.error.noGrades': 'Nisu pronađene ocjene',
  'grade.error.courseAverageFailed': 'Nije uspjelo izračunati prosjek kursa',
  'grade.error.gpaFailed': 'Nije uspjelo izračunati prosjek ocjena',
  'grade.error.transcriptFailed': 'Nije uspjelo kreiranje transkripta',
}
