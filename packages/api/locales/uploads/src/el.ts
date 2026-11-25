import type { UploadsTranslations } from './types.js'

/** Uploads translations for Greek. */
export const el: UploadsTranslations = {
  'uploads.error.noProvider':
    'Ο πάροχος μεταφόρτωσης δεν έχει ρυθμιστεί. Καλέστε πρώτα setProvider().',
  'uploads.error.streamLimitReached': 'Συμπληρώθηκε το όριο ροής.',
  'uploads.error.aborted': 'Η μεταφόρτωση ακυρώθηκε.',
  'uploads.error.fileTypeBlocked': 'Δεν είναι δυνατή η μεταφόρτωση αρχείων τύπου {{type}}.',
  'uploads.error.activeTypeListed':
    'Το receiveUploads() περιλαμβάνει τον τύπο {{type}}, που τον εκτελεί ένα πρόγραμμα περιήγησης. Περάστε allowActiveTypes: true για να αποθηκευτεί και σερβίρετε αυτά τα αρχεία με sendUpload().',
}
