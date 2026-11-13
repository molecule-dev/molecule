import type { AuthTranslations } from './types.js'

/** Auth translations for el. */
export const el: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'Αποτυχία σύνδεσης',
  'auth.error.requestFailed': 'Το αίτημα απέτυχε',
  'auth.error.registrationFailed': 'Η εγγραφή απέτυχε',
  'auth.error.noRefreshToken': 'Δεν υπάρχει διαθέσιμο διακριτικό ανανέωσης',
  'auth.error.profileRequiresSignIn': 'Συνδεθείτε πριν από την ενημέρωση ενός προφίλ',
  'auth.error.profileSessionChanged': 'Η περίοδος σύνδεσης προφίλ άλλαξε πριν από την υποβολή',
  'auth.error.passwordRequiresSignIn': 'Συνδεθείτε πριν αλλάξετε έναν κωδικό πρόσβασης',
  'auth.error.passwordSessionChanged': 'Η συνεδρία κωδικού πρόσβασης άλλαξε πριν από την υποβολή',
  'auth.error.requestTimedOut': 'Το χρονικό όριο του αιτήματος ελέγχου ταυτότητας έληξε',
}
