import type { GradeTranslations } from './types.js'

/** Grade translations for Dutch. */
export const nl: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId en courseId zijn verplicht.',
  'grade.error.scoreNumeric': 'scorePoints en maxPoints moeten getallen zijn.',
  'grade.error.maxPointsPositive': 'maxPoints moet groter zijn dan nul.',
  'grade.error.scoreOutOfRange': 'scorePoints moet tussen 0 en maxPoints liggen.',
  'grade.error.createFailed': 'Cijfer niet ingevoerd',
  'grade.error.notFound': 'Cijfer niet gevonden',
  'grade.error.readFailed': 'Niet in staat om het cijfer te lezen',
  'grade.error.listFailed': 'Cijfers niet vermeld',
  'grade.error.updateFailed': 'Het bijwerken van het cijfer is mislukt.',
  'grade.error.deleteFailed': 'Het verwijderen van het cijfer is mislukt.',
  'grade.error.noGrades': 'Geen cijfers gevonden',
  'grade.error.courseAverageFailed': 'Het is niet gelukt om het cursusgemiddelde te berekenen.',
  'grade.error.gpaFailed': 'Het berekenen van het GPA is mislukt.',
  'grade.error.transcriptFailed': 'Het is niet gelukt om een transcript te genereren.',
}
