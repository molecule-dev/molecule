import type { FileCardTranslations } from './types.js'

/** FileCard translations for el. */
export const el: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Έγγραφο',
  'file-card.kind.archive': 'Αρχειοθέτηση',
  'file-card.kind.other': 'Αρχείο',
  'file-card.modified.just-now': 'μόλις τώρα',
  'file-card.modified.minute-other': '{{count}} λεπτά πριν',
  'file-card.kind.image': 'Αρχείο εικόνας',
  'file-card.kind.video': 'Αρχείο βίντεο',
  'file-card.kind.audio': 'Αρχείο ήχου',
  'file-card.kind.code': 'Αρχείο κώδικα',
  'file-card.kind.folder': 'Ντοσιέ',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Μέγεθος {{size}}',
  'file-card.aria.modified': 'Τροποποιημένο {{when}}',
  'file-card.modified.minute-one': 'πριν από 1 λεπτό',
  'file-card.modified.hour-one': 'πριν από 1 ώρα',
  'file-card.modified.hour-other': '{{count}} πριν από μία ώρα',
  'file-card.modified.day-one': 'εχθές',
  'file-card.modified.day-other': '{{count}} μέρες πριν',
  'file-card.modified.week-one': 'πριν από 1 εβδομάδα',
  'file-card.modified.week-other': '{{count}} εβδομάδα πριν',
  'file-card.modified.month-one': 'πριν από 1 μήνα',
  'file-card.modified.month-other': '{{count}} πριν από ένα μήνα',
}
