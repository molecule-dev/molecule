import type { GradeTranslations } from './types.js'

/** Grade translations for Hungarian. */
export const hu: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'A regisztrációs azonosító, a feladatazonosító, a felhasználói azonosító és a kurzusazonosító megadása kötelező.',
  'grade.error.scoreNumeric': 'A scorePoints és maxPoints értékeknek számoknak kell lenniük.',
  'grade.error.maxPointsPositive': 'A maxPoints értékének nagyobbnak kell lennie, mint nulla',
  'grade.error.scoreOutOfRange': 'A pontszámnak 0 és maxPoints között kell lennie.',
  'grade.error.createFailed': 'Nem sikerült közzétenni az osztályzatot',
  'grade.error.notFound': 'Nem található osztályzat',
  'grade.error.readFailed': 'Nem sikerült beolvasni az osztályzatot',
  'grade.error.listFailed': 'Nem sikerült listázni az osztályzatokat',
  'grade.error.updateFailed': 'Nem sikerült frissíteni az érdemjegyet',
  'grade.error.deleteFailed': 'Nem sikerült törölni az érdemjegyet',
  'grade.error.noGrades': 'Nincsenek osztályzatok',
  'grade.error.courseAverageFailed': 'Nem sikerült kiszámítani a kurzus átlagát',
  'grade.error.gpaFailed': 'Nem sikerült kiszámítani az átlagot',
  'grade.error.transcriptFailed': 'Nem sikerült létrehozni az átiratot',
}
