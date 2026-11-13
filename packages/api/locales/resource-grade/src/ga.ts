import type { GradeTranslations } from './types.js'

/** Grade translations for Irish. */
export const ga: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Tá aitheantas clárúcháin, aitheantas sannadh, aitheantas úsáideora, agus aitheantas cúrsa riachtanach',
  'grade.error.scoreNumeric': 'Ní mór do scórphointí agus uasphointí a bheith ina n-uimhreacha',
  'grade.error.maxPointsPositive': 'Ní mór do maxPoints a bheith níos mó ná náid',
  'grade.error.scoreOutOfRange': 'Ní mór do scórphointí a bheith idir 0 agus uasphointí',
  'grade.error.createFailed': 'Theip ar an ngrád a phostáil',
  'grade.error.notFound': 'Grád gan aimsiú',
  'grade.error.readFailed': 'Theip ar an ngrád a léamh',
  'grade.error.listFailed': 'Theip ar na gráid a liostáil',
  'grade.error.updateFailed': 'Theip ar an ngrád a nuashonrú',
  'grade.error.deleteFailed': 'Theip ar an ngrád a scriosadh',
  'grade.error.noGrades': 'Níor aimsíodh aon ghráid',
  'grade.error.courseAverageFailed': 'Theip ar mheán an chúrsa a ríomh',
  'grade.error.gpaFailed': 'Theip ar GPA a ríomh',
  'grade.error.transcriptFailed': 'Theip ar an trascríbhinn a thógáil',
}
