import type { ContactsTranslations } from './types.js'

/** Contacts translations for Greek. */
export const el: ContactsTranslations = {
  'contacts.unknown': 'Άγνωστο',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Δεν έχει οριστεί πάροχος. Καλέστε `setProvider()` με μια υλοποίηση `ContactsProvider` — Η Molecule δεν παρέχει κανέναν πάροχο για αυτήν. Υλοποιήστε τη διεπαφή στον εγγενή χρόνο εκτέλεσης (runtime) και συνδέστε την.',
}
