import type { GradeTranslations } from './types.js'

/** Grade translations for Croatian. */
export const hr: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'Obavezni su ID upisa, ID zadatka, ID korisnika i ID tečaja',
  'grade.error.scoreNumeric': 'scorePoints i maxPoints moraju biti brojevi',
  'grade.error.maxPointsPositive': 'maxPoints mora biti veći od nule',
  'grade.error.scoreOutOfRange': 'scorePoints mora biti između 0 i maxPoints',
  'grade.error.createFailed': 'Objavljivanje ocjene nije uspjelo',
  'grade.error.notFound': 'Ocjena nije pronađena',
  'grade.error.readFailed': 'Nije moguće pročitati ocjenu',
  'grade.error.listFailed': 'Popis ocjena nije uspio',
  'grade.error.updateFailed': 'Nije uspjelo ažuriranje ocjene',
  'grade.error.deleteFailed': 'Brisanje ocjene nije uspjelo',
  'grade.error.noGrades': 'Nisu pronađene ocjene',
  'grade.error.courseAverageFailed': 'Nije uspjelo izračunati prosjek tečaja',
  'grade.error.gpaFailed': 'Nije uspjelo izračunati prosjek ocjena',
  'grade.error.transcriptFailed': 'Nije uspjelo izraditi transkript',
}
