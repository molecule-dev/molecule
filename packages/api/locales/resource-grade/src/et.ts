import type { GradeTranslations } from './types.js'

/** Grade translations for Estonian. */
export const et: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'RegistreerimiseId, ülesandeId, kasutajaId ja kursuseId on kohustuslikud.',
  'grade.error.scoreNumeric': 'scorePoints ja maxPoints peavad olema numbrid',
  'grade.error.maxPointsPositive': 'maxPoints peab olema suurem kui null',
  'grade.error.scoreOutOfRange': 'punktisumma peab olema vahemikus 0 kuni maxPoints',
  'grade.error.createFailed': 'Hinde postitamine ebaõnnestus',
  'grade.error.notFound': 'Hinnet ei leitud',
  'grade.error.readFailed': 'Hinde lugemine ebaõnnestus',
  'grade.error.listFailed': 'Hinnete loetlemine ebaõnnestus',
  'grade.error.updateFailed': 'Hinde värskendamine ebaõnnestus',
  'grade.error.deleteFailed': 'Hinde kustutamine ebaõnnestus',
  'grade.error.noGrades': 'Hinneid ei leitud',
  'grade.error.courseAverageFailed': 'Kursuse keskmise arvutamine ebaõnnestus',
  'grade.error.gpaFailed': 'GPA arvutamine ebaõnnestus',
  'grade.error.transcriptFailed': 'Transkripti loomine ebaõnnestus',
}
