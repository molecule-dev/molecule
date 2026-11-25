import type { PushTranslations } from './types.js'

/** Push translations for Greek. */
export const el: PushTranslations = {
  'push.error.notSupported': 'Οι ειδοποιήσεις push δεν υποστηρίζονται',
  'push.error.permissionNotGranted': 'Η άδεια ειδοποιήσεων δεν χορηγήθηκε',
  'push.error.missingDependency':
    '`{{library}}` απαιτείται αλλά δεν είναι εγκατεστημένο. Εγκαταστήστε το με: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Δεν έχει καταχωριστεί service worker. Οι ειδοποιήσεις push χρειάζονται την έκδοση παραγωγής της εφαρμογής με εγκατεστημένο το @molecule/app-pwa-default.',
}
