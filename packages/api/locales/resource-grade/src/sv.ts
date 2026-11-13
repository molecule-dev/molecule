import type { GradeTranslations } from './types.js'

/** Grade translations for Swedish. */
export const sv: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'registrerings-ID, uppgifts-ID, användar-ID och kurs-ID är obligatoriska',
  'grade.error.scoreNumeric': 'scorePoints och maxPoints måste vara siffror',
  'grade.error.maxPointsPositive': 'maxPoints måste vara större än noll',
  'grade.error.scoreOutOfRange': 'poängPoäng måste vara mellan 0 och maxPoäng',
  'grade.error.createFailed': 'Misslyckades med att publicera betyget',
  'grade.error.notFound': 'Betyget hittades inte',
  'grade.error.readFailed': 'Misslyckades med att läsa betyget',
  'grade.error.listFailed': 'Kunde inte lista betyg',
  'grade.error.updateFailed': 'Misslyckades med att uppdatera betyget',
  'grade.error.deleteFailed': 'Misslyckades med att ta bort betyget',
  'grade.error.noGrades': 'Inga betyg hittades',
  'grade.error.courseAverageFailed': 'Misslyckades med att beräkna kursgenomsnittet',
  'grade.error.gpaFailed': 'Misslyckades med att beräkna GPA',
  'grade.error.transcriptFailed': 'Misslyckades med att skapa transkriptionen',
}
