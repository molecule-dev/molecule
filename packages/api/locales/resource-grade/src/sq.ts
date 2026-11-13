import type { GradeTranslations } from './types.js'

/** Grade translations for Albanian. */
export const sq: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'ID e regjistrimit, ID e detyrës, ID e përdoruesit dhe ID e kursit janë të detyrueshme',
  'grade.error.scoreNumeric': 'ScorePoints dhe maxPoints duhet të jenë numra',
  'grade.error.maxPointsPositive': 'Pikët maksimale duhet të jenë më të mëdha se zero',
  'grade.error.scoreOutOfRange': 'Pikët e rezultatit duhet të jenë midis 0 dhe pikëve maksimale',
  'grade.error.createFailed': 'Dështoi në postimin e notës',
  'grade.error.notFound': 'Nota nuk u gjet',
  'grade.error.readFailed': 'Dështoi në leximin e notës',
  'grade.error.listFailed': 'Dështoi në renditjen e notave',
  'grade.error.updateFailed': 'Përditësimi i notës dështoi',
  'grade.error.deleteFailed': 'Fshirja e notës dështoi',
  'grade.error.noGrades': 'Nuk u gjetën nota',
  'grade.error.courseAverageFailed': 'Dështoi në llogaritjen e mesatares së kursit',
  'grade.error.gpaFailed': 'Dështoi në llogaritjen e GPA-së',
  'grade.error.transcriptFailed': 'Dështoi në ndërtimin e transkriptit',
}
