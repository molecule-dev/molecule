import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Greek. */
export const el: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'Η configure() δεν υποστηρίζεται από αυτόν τον πάροχο οθόνης εκκίνησης.',
  'splashScreen.error.missingDependency':
    '`{{library}}` απαιτείται αλλά δεν είναι εγκατεστημένο. Εγκαταστήστε το με: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Δεν έχει οριστεί πάροχος. Καλέστε `setProvider()` με μια υλοποίηση `SplashScreenProvider` (π.χ., από την `@molecule/app-splash-screen-react-native`).',
}
