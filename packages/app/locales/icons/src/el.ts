import type { IconsTranslations } from './types.js'

/** Icons translations for Greek. */
export const el: IconsTranslations = {
  'icons.error.noIconSet':
    'Δεν έχει οριστεί κανένα IconSet. Καλέστε τη setIconSet() κατά την εκκίνηση της εφαρμογής με μια βιβλιοθήκη εικονιδίων (π.χ. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Δεν έχει συνδεθεί κανένα σετ εικονιδίων. Καλέστε τη setIconSet() με ένα IconSet (π.χ. την εξαγωγή από το @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Το εικονίδιο "{{name}}" δεν βρέθηκε στο τρέχον σετ εικονιδίων.',
}
