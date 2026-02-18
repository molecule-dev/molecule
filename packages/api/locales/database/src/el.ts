import type { DatabaseTranslations } from './types.js'

/** Database translations for Greek. */
export const el: DatabaseTranslations = {
  'database.error.noProvider':
    'Η δεξαμενή βάσης δεδομένων δεν έχει ρυθμιστεί. Καλέστε πρώτα setPool().',
  'database.error.storeNotConfigured': 'Το DataStore δεν έχει ρυθμιστεί. Καλέστε πρώτα setStore().',
}
