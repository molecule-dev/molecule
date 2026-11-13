import type { ConversationTranslations } from './types.js'

/** Conversation translations for Greek. */
export const el: ConversationTranslations = {
  'conversation.error.messageRequired': 'Απαιτείται μήνυμα',
  'conversation.error.aiNotConfigured': 'Ο πάροχος AI δεν έχει ρυθμιστεί',
  'conversation.error.unknownAiError': 'Άγνωστο σφάλμα AI',
  'conversation.error.notFound': 'Δεν βρέθηκε συνομιλία',
  'conversation.error.streamError': 'Σφάλμα ροής AI',
  'conversation.error.forbidden': 'Δεν επιτρέπεται η πρόσβαση',
  'conversation.error.unauthorized': 'Ανεξουσιοδότητος',
  'conversation.error.clearFailed': 'Η εκκαθάριση της συνομιλίας απέτυχε',
  'conversation.error.idRequired':
    'Το conversationId απαιτείται όταν το έργο έχει περισσότερες από μία συνομιλίες',
  'conversation.error.historyFailed': 'Αποτυχία φόρτωσης ιστορικού συνομιλίας',
  'conversation.error.readFailed': 'Αποτυχία ανάγνωσης συνομιλίας',
  'conversation.error.updateFailed': 'Η ενημέρωση της συνομιλίας απέτυχε',
}
