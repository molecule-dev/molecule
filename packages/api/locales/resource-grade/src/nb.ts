import type { GradeTranslations } from './types.js'

/** Grade translations for Norwegian Bokmål. */
export const nb: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'registrerings-ID, oppgave-ID, bruker-ID og kurs-ID er obligatoriske',
  'grade.error.scoreNumeric': 'scorePoints og maxPoints må være tall',
  'grade.error.maxPointsPositive': 'makspoeng må være større enn null',
  'grade.error.scoreOutOfRange': 'poengsumPoeng må være mellom 0 og makspoeng',
  'grade.error.createFailed': 'Kunne ikke legge ut karakteren',
  'grade.error.notFound': 'Karakteren ble ikke funnet',
  'grade.error.readFailed': 'Klarte ikke å lese karakteren',
  'grade.error.listFailed': 'Kunne ikke liste opp karakterer',
  'grade.error.updateFailed': 'Kunne ikke oppdatere karakteren',
  'grade.error.deleteFailed': 'Kunne ikke slette karakteren',
  'grade.error.noGrades': 'Ingen karakterer funnet',
  'grade.error.courseAverageFailed': 'Kunne ikke beregne kursgjennomsnittet',
  'grade.error.gpaFailed': 'Kunne ikke beregne GPA',
  'grade.error.transcriptFailed': 'Kunne ikke lage transkripsjon',
}
