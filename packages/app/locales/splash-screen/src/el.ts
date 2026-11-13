import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Greek. */
export const el: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Ο πάροχος οθόνης εκκίνησης δεν έχει ρυθμιστεί.',
  'splashScreen.warn.configureNotSupported':
    'Η configure() δεν υποστηρίζεται από αυτόν τον πάροχο οθόνης εκκίνησης.',
  'splashScreen.error.missingDependency':
    '`{{library}}` απαιτείται αλλά δεν είναι εγκατεστημένο. Εγκαταστήστε το με: `npx expo install {{library}}`',
}
