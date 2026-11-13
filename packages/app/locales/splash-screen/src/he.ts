import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hebrew. */
export const he: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'ספק מסך הפתיחה אינו מוגדר.',
  'splashScreen.warn.configureNotSupported': 'configure() אינו נתמך על ידי ספק מסך הפתיחה הזה.',
  'splashScreen.error.missingDependency':
    '`{{library}}` נדרש אך אינו מותקן. התקן אותו באמצעות: `npx expo install {{library}}`',
}
