import type { ProjectTranslations } from './types.js'

/** Project translations for Greek. */
export const el: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Απαιτούνται όνομα και projectType',
  'project.error.notFound': 'Δεν βρέθηκε',
  'project.error.forbidden': 'Δεν επιτρέπεται η πρόσβαση',
  'project.error.createFailed': 'Η δημιουργία του έργου απέτυχε',
  'project.error.invalidType':
    'Μη υποστηριζόμενος τύπος έργου. Αναμενόταν ένα από τα εξής: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Η διαγραφή του έργου απέτυχε',
  'project.error.listFailed': 'Αποτυχία καταχώρισης έργων',
  'project.error.readFailed': 'Αποτυχία ανάγνωσης έργου',
  'project.error.updateFailed': 'Η ενημέρωση του έργου απέτυχε',
}
