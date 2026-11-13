import type { GradeTranslations } from './types.js'

/** Grade translations for Amharic. */
export const am: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'የምዝገባ መታወቂያ፣ የተግባር መለያ መታወቂያ፣ የተጠቃሚ መለያ መታወቂያ እና የኮርስ መለያ ቁጥር ያስፈልጋሉ',
  'grade.error.scoreNumeric': 'የውጤት ነጥቦች እና ከፍተኛ ነጥቦች ቁጥሮች መሆን አለባቸው',
  'grade.error.maxPointsPositive': 'ከፍተኛ ነጥቦች ከዜሮ በላይ መሆን አለባቸው',
  'grade.error.scoreOutOfRange': 'የውጤት ነጥቦች በ0 እና ከፍተኛ ነጥቦች መካከል መሆን አለባቸው',
  'grade.error.createFailed': 'ደረጃ ማውጣት አልተሳካም',
  'grade.error.notFound': 'ደረጃ አልተገኘም',
  'grade.error.readFailed': 'ደረጃውን ማንበብ አልተሳካም',
  'grade.error.listFailed': 'ውጤቶችን መዘርዘር አልተሳካም',
  'grade.error.updateFailed': 'ደረጃን ማዘመን አልተሳካም',
  'grade.error.deleteFailed': 'ደረጃን መሰረዝ አልተሳካም',
  'grade.error.noGrades': 'ምንም ውጤት አልተገኘም',
  'grade.error.courseAverageFailed': 'የኮርስ አማካይን ማስላት አልተሳካም',
  'grade.error.gpaFailed': 'GPAን ማስላት አልተሳካም',
  'grade.error.transcriptFailed': 'ትራንስክሪፕት መገንባት አልተሳካም',
}
