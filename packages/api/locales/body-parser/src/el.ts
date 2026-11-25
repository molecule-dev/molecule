import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Greek. */
export const el: BodyParserTranslations = {
  'middleware.error.badRequest': 'Κακό αίτημα.',
  'middleware.error.fileTooLarge': 'Το αρχείο είναι μεγαλύτερο από {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Αυτός ο τύπος αρχείου δεν επιτρέπεται. Επιτρεπόμενοι τύποι: {{types}}.',
  'middleware.error.fileMissing': 'Στείλτε ένα αρχείο στο πεδίο "{{field}}".',
  'middleware.error.tooManyFiles': 'Πάρα πολλά αρχεία. Το όριο είναι {{max}}.',
  'middleware.error.unexpectedFile': 'Στείλτε το αρχείο στο πεδίο "{{expected}}", όχι "{{field}}".',
  'middleware.error.notMultipart':
    'Στείλτε το αρχείο ως multipart/form-data στο πεδίο "{{field}}".',
  'middleware.error.payloadTooLarge': 'Το αίτημα είναι πολύ μεγάλο.',
}
