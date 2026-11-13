import type { GradeTranslations } from './types.js'

/** Grade translations for Greek. */
export const el: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Απαιτούνται τα enrollmentId, assignmentId, userId και courseId',
  'grade.error.scoreNumeric': 'Τα scorePoints και τα maxPoints πρέπει να είναι αριθμοί',
  'grade.error.maxPointsPositive': 'Τα maxPoints πρέπει να είναι μεγαλύτερα από μηδέν',
  'grade.error.scoreOutOfRange': 'Οι βαθμολογικοί πόντοι πρέπει να είναι μεταξύ 0 και maxPoints',
  'grade.error.createFailed': 'Η δημοσίευση του βαθμού απέτυχε',
  'grade.error.notFound': 'Δεν βρέθηκε βαθμός',
  'grade.error.readFailed': 'Αποτυχία ανάγνωσης βαθμού',
  'grade.error.listFailed': 'Αποτυχία καταχώρισης βαθμών',
  'grade.error.updateFailed': 'Η ενημέρωση του βαθμού απέτυχε',
  'grade.error.deleteFailed': 'Η διαγραφή του βαθμού απέτυχε',
  'grade.error.noGrades': 'Δεν βρέθηκαν βαθμοί',
  'grade.error.courseAverageFailed': 'Αποτυχία υπολογισμού του μέσου όρου του μαθήματος',
  'grade.error.gpaFailed': 'Αποτυχία υπολογισμού του μέσου όρου βαθμολογίας (GPA)',
  'grade.error.transcriptFailed': 'Η δημιουργία μεταγραφής απέτυχε',
}
