import type { GradeTranslations } from './types.js'

/** Grade translations for Finnish. */
export const fi: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'ilmoittautumistunnus, tehtävätunnus, käyttäjätunnus ja kurssin tunnus ovat pakollisia.',
  'grade.error.scoreNumeric': 'scorePoints- ja maxPoints-arvojen on oltava numeroita',
  'grade.error.maxPointsPositive': 'maxPoints-arvon on oltava suurempi kuin nolla',
  'grade.error.scoreOutOfRange': 'scorePoints-arvon on oltava 0:n ja maxPoints-arvon välillä.',
  'grade.error.createFailed': 'Arvosanan lähettäminen epäonnistui',
  'grade.error.notFound': 'Arvosanaa ei löytynyt',
  'grade.error.readFailed': 'Arvosanan lukeminen epäonnistui',
  'grade.error.listFailed': 'Arvosanojen listaaminen epäonnistui',
  'grade.error.updateFailed': 'Arvosanan päivittäminen epäonnistui',
  'grade.error.deleteFailed': 'Arvosanan poistaminen epäonnistui',
  'grade.error.noGrades': 'Ei arvosanoja',
  'grade.error.courseAverageFailed': 'Kurssin keskiarvon laskeminen epäonnistui',
  'grade.error.gpaFailed': 'Keskiarvon laskeminen epäonnistui',
  'grade.error.transcriptFailed': 'Transkriptin luominen epäonnistui',
}
