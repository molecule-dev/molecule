import type { GradeTranslations } from './types.js'

/** Grade translations for Welsh. */
export const cy: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Mae angen ID cofrestru, ID aseiniad, ID defnyddiwr, ac ID cwrs',
  'grade.error.scoreNumeric': 'Rhaid i sgôrPwyntiau ac uchafswmPwyntiau fod yn rhifau',
  'grade.error.maxPointsPositive': 'Rhaid i maxPoints fod yn fwy na sero',
  'grade.error.scoreOutOfRange': "Rhaid i sgôrbwyntiau fod rhwng 0 a'r uchafswm pwyntiau",
  'grade.error.createFailed': 'Methwyd postio gradd',
  'grade.error.notFound': 'Gradd heb ei chanfod',
  'grade.error.readFailed': 'Methwyd darllen y radd',
  'grade.error.listFailed': 'Methwyd rhestru graddau',
  'grade.error.updateFailed': "Methwyd diweddaru'r radd",
  'grade.error.deleteFailed': 'Methwyd dileu gradd',
  'grade.error.noGrades': 'Ni chanfuwyd unrhyw raddau',
  'grade.error.courseAverageFailed': 'Methwyd cyfrifo cyfartaledd y cwrs',
  'grade.error.gpaFailed': 'Methwyd cyfrifo GPA',
  'grade.error.transcriptFailed': 'Methwyd creu trawsgrifiad',
}
