import type { GradeTranslations } from './types.js'

/** Grade translations for Georgian. */
export const ka: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'საჭიროა რეგისტრაციის ID, დავალების ID, მომხმარებლის ID და კურსის ID',
  'grade.error.scoreNumeric': 'scorePoints და maxPoints რიცხვები უნდა იყოს',
  'grade.error.maxPointsPositive': 'maxPoints უნდა იყოს ნულზე მეტი',
  'grade.error.scoreOutOfRange': 'ქულების რაოდენობა უნდა იყოს 0-დან მაქსიმუმ 100 ქულამდე',
  'grade.error.createFailed': 'შეფასების გამოქვეყნება ვერ მოხერხდა',
  'grade.error.notFound': 'შეფასება ვერ მოიძებნა',
  'grade.error.readFailed': 'შეფასების წაკითხვა ვერ მოხერხდა',
  'grade.error.listFailed': 'შეფასებების ჩამოთვლა ვერ მოხერხდა',
  'grade.error.updateFailed': 'შეფასების განახლება ვერ მოხერხდა',
  'grade.error.deleteFailed': 'შეფასების წაშლა ვერ მოხერხდა',
  'grade.error.noGrades': 'შეფასებები ვერ მოიძებნა',
  'grade.error.courseAverageFailed': 'კურსის საშუალო მაჩვენებლის გამოთვლა ვერ მოხერხდა',
  'grade.error.gpaFailed': 'GPA-ს გამოთვლა ვერ მოხერხდა',
  'grade.error.transcriptFailed': 'ტრანსკრიპტის შექმნა ვერ მოხერხდა',
}
