import type { GradeTranslations } from './types.js'

/** Grade translations for German. */
export const de: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId und courseId sind erforderlich.',
  'grade.error.scoreNumeric': 'scorePoints und maxPoints müssen Zahlen sein.',
  'grade.error.maxPointsPositive': 'maxPoints muss größer als null sein.',
  'grade.error.scoreOutOfRange':
    'Die Punktzahl (scorePoints) muss zwischen 0 und maxPoints liegen.',
  'grade.error.createFailed': 'Note konnte nicht übermittelt werden',
  'grade.error.notFound': 'Note nicht gefunden',
  'grade.error.readFailed': 'Note konnte nicht gelesen werden',
  'grade.error.listFailed': 'Noten wurden nicht aufgeführt',
  'grade.error.updateFailed': 'Note konnte nicht aktualisiert werden',
  'grade.error.deleteFailed': 'Note konnte nicht gelöscht werden',
  'grade.error.noGrades': 'Keine Noten gefunden',
  'grade.error.courseAverageFailed': 'Kursdurchschnitt konnte nicht berechnet werden',
  'grade.error.gpaFailed': 'Die Berechnung des Notendurchschnitts ist fehlgeschlagen.',
  'grade.error.transcriptFailed': 'Fehler beim Erstellen des Transkripts',
}
