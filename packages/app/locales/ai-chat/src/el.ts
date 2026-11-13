import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Greek. */
export const el: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Δεν υπάρχει σώμα απάντησης',
  'chat.error.streamError': 'Σφάλμα ροής',
  'chat.error.unknownError': 'Άγνωστο σφάλμα',
  'chat.error.sendFailed': 'Η αποστολή του μηνύματος απέτυχε',
  'chat.error.stalled':
    '{{agentName}} σταμάτησε να ανταποκρίνεται. Ενδέχεται να εξακολουθεί να ολοκληρώνεται στο παρασκήνιο — επαναλάβετε τη φόρτωση για να δείτε τα πιο πρόσφατα ή στείλτε ένα νέο μήνυμα.',
}
