import type { GradeTranslations } from './types.js'

/** Grade translations for Hindi. */
export const hi: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId और courseId आवश्यक हैं।',
  'grade.error.scoreNumeric': 'scorePoints और maxPoints दोनों संख्याएँ होनी चाहिए।',
  'grade.error.maxPointsPositive': 'अधिकतम अंक शून्य से अधिक होने चाहिए',
  'grade.error.scoreOutOfRange': 'स्कोर पॉइंट्स 0 और अधिकतम पॉइंट्स के बीच होने चाहिए।',
  'grade.error.createFailed': 'ग्रेड पोस्ट करने में असफल',
  'grade.error.notFound': 'ग्रेड नहीं मिला',
  'grade.error.readFailed': 'ग्रेड पढ़ने में असफल',
  'grade.error.listFailed': 'ग्रेड सूचीबद्ध करने में विफल',
  'grade.error.updateFailed': 'ग्रेड अपडेट करने में विफल',
  'grade.error.deleteFailed': 'ग्रेड हटाने में विफल',
  'grade.error.noGrades': 'कोई ग्रेड नहीं मिले',
  'grade.error.courseAverageFailed': 'पाठ्यक्रम औसत की गणना करने में विफल',
  'grade.error.gpaFailed': 'जीपीए की गणना करने में विफल',
  'grade.error.transcriptFailed': 'ट्रांसक्रिप्ट बनाने में विफल',
}
