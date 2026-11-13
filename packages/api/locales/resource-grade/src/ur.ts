import type { GradeTranslations } from './types.js'

/** Grade translations for Urdu. */
export const ur: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId، assignmentId، userId، اور courseId درکار ہیں۔',
  'grade.error.scoreNumeric': 'سکور پوائنٹس اور میکس پوائنٹس نمبرز ہونے چاہئیں',
  'grade.error.maxPointsPositive': 'maxPoints صفر سے زیادہ ہونا چاہیے۔',
  'grade.error.scoreOutOfRange': 'سکور پوائنٹس 0 اور maxPoints کے درمیان ہونے چاہئیں',
  'grade.error.createFailed': 'پوسٹ گریڈ کرنے میں ناکام',
  'grade.error.notFound': 'گریڈ نہیں ملا',
  'grade.error.readFailed': 'گریڈ پڑھنے میں ناکام',
  'grade.error.listFailed': 'درجات درج کرنے میں ناکام',
  'grade.error.updateFailed': 'گریڈ اپ ڈیٹ کرنے میں ناکام',
  'grade.error.deleteFailed': 'گریڈ حذف کرنے میں ناکام',
  'grade.error.noGrades': 'کوئی گریڈ نہیں ملا',
  'grade.error.courseAverageFailed': 'کورس اوسط کا حساب لگانے میں ناکام',
  'grade.error.gpaFailed': 'GPA کا حساب لگانے میں ناکام',
  'grade.error.transcriptFailed': 'ٹرانسکرپٹ بنانے میں ناکام',
}
