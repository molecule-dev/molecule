import type { GradeTranslations } from './types.js'

/** Grade translations for Nepali. */
export const ne: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId, र courseId आवश्यक छ।',
  'grade.error.scoreNumeric': 'स्कोरपोइन्ट र अधिकतमपोइन्टहरू संख्याहरू हुनुपर्छ।',
  'grade.error.maxPointsPositive': 'अधिकतम बिन्दुहरू शून्य भन्दा ठूलो हुनुपर्छ।',
  'grade.error.scoreOutOfRange': 'स्कोरपोइन्टहरू ० र अधिकतमपोइन्टहरू बीच हुनुपर्छ।',
  'grade.error.createFailed': 'ग्रेड पोस्ट गर्न असफल भयो',
  'grade.error.notFound': 'ग्रेड भेटिएन',
  'grade.error.readFailed': 'ग्रेड पढ्न असफल भयो',
  'grade.error.listFailed': 'ग्रेडहरू सूचीबद्ध गर्न असफल भयो',
  'grade.error.updateFailed': 'ग्रेड अद्यावधिक गर्न असफल भयो',
  'grade.error.deleteFailed': 'ग्रेड मेटाउन असफल भयो',
  'grade.error.noGrades': 'कुनै पनि ग्रेड भेटिएन',
  'grade.error.courseAverageFailed': 'पाठ्यक्रम औसत गणना गर्न असफल भयो',
  'grade.error.gpaFailed': 'GPA गणना गर्न असफल भयो',
  'grade.error.transcriptFailed': 'ट्रान्सक्रिप्ट निर्माण गर्न असफल भयो',
}
