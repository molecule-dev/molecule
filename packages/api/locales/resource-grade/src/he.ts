import type { GradeTranslations } from './types.js'

/** Grade translations for Hebrew. */
export const he: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'מזהה רישום, מזהה משימה, מזהה משתמש ומזהה קורס נדרשים',
  'grade.error.scoreNumeric': 'נקודות scorePoint ו-maxPoints חייבות להיות מספרים',
  'grade.error.maxPointsPositive': 'maxPoints חייב להיות גדול מאפס',
  'grade.error.scoreOutOfRange': 'נקודות הציון חייבות להיות בין 0 לנקודות המקסימום',
  'grade.error.createFailed': 'פרסום הציון נכשל',
  'grade.error.notFound': 'הציון לא נמצא',
  'grade.error.readFailed': 'נכשל בקריאת הציון',
  'grade.error.listFailed': 'נכשלה רשימת הציונים',
  'grade.error.updateFailed': 'עדכון הציון נכשל',
  'grade.error.deleteFailed': 'מחיקת הציון נכשלה',
  'grade.error.noGrades': 'לא נמצאו ציונים',
  'grade.error.courseAverageFailed': 'נכשל בחישוב ממוצע הקורס',
  'grade.error.gpaFailed': 'נכשל בחישוב ממוצע ציונים',
  'grade.error.transcriptFailed': 'נכשל בניית התמליל',
}
