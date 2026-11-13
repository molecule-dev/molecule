import type { GradeTranslations } from './types.js'

/** Grade translations for Telugu. */
export const te: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId, మరియు courseId తప్పనిసరి',
  'grade.error.scoreNumeric':
    'స్కోర్‌పాయింట్స్ మరియు మాక్స్‌పాయింట్స్ తప్పనిసరిగా సంఖ్యలు అయి ఉండాలి',
  'grade.error.maxPointsPositive': 'maxPoints సున్నా కంటే ఎక్కువగా ఉండాలి',
  'grade.error.scoreOutOfRange': 'స్కోర్‌పాయింట్లు 0 మరియు గరిష్ట పాయింట్ల మధ్య ఉండాలి',
  'grade.error.createFailed': 'గ్రేడ్ పోస్ట్ చేయడంలో విఫలమయ్యారు',
  'grade.error.notFound': 'గ్రేడ్ కనుగొనబడలేదు',
  'grade.error.readFailed': 'గ్రేడ్ చదవడంలో విఫలమయ్యారు',
  'grade.error.listFailed': 'గ్రేడ్‌లను జాబితా చేయడంలో విఫలమయ్యారు',
  'grade.error.updateFailed': 'గ్రేడ్‌ను అప్‌డేట్ చేయడంలో విఫలమైంది',
  'grade.error.deleteFailed': 'గ్రేడ్‌ను తొలగించడంలో విఫలమయ్యారు',
  'grade.error.noGrades': 'గ్రేడ్‌లు ఏవీ కనుగొనబడలేదు',
  'grade.error.courseAverageFailed': 'కోర్సు సగటును లెక్కించడంలో విఫలమయ్యారు',
  'grade.error.gpaFailed': 'GPAని లెక్కించడంలో విఫలమయ్యారు',
  'grade.error.transcriptFailed': 'ట్రాన్స్క్రిప్ట్ నిర్మించడంలో విఫలమైంది',
}
