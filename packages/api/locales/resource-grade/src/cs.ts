import type { GradeTranslations } from './types.js'

/** Grade translations for Czech. */
export const cs: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Položky enrollmentId, assignmentId, userId a courseId jsou povinné.',
  'grade.error.scoreNumeric': 'Hodnoty scorePoints a maxPoints musí být čísla.',
  'grade.error.maxPointsPositive': 'maxPoints musí být větší než nula',
  'grade.error.scoreOutOfRange': 'Hodnota scorePoints musí být mezi 0 a maxPoints.',
  'grade.error.createFailed': 'Zveřejnění hodnocení se nezdařilo',
  'grade.error.notFound': 'Známka nenalezena',
  'grade.error.readFailed': 'Nepodařilo se přečíst známku',
  'grade.error.listFailed': 'Nepodařilo se zobrazit známky',
  'grade.error.updateFailed': 'Nepodařilo se aktualizovat hodnocení',
  'grade.error.deleteFailed': 'Známku se nepodařilo smazat',
  'grade.error.noGrades': 'Nenalezeny žádné známky',
  'grade.error.courseAverageFailed': 'Nepodařilo se vypočítat průměr kurzu',
  'grade.error.gpaFailed': 'Nepodařilo se vypočítat průměr známek (GPA)',
  'grade.error.transcriptFailed': 'Nepodařilo se vytvořit přepis',
}
