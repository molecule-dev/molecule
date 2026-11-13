import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hebrew. */
export const he: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() אינו נתמך על ידי ספק מסך הפתיחה הזה.',
  'splashScreen.error.missingDependency':
    '`{{library}}` נדרש אך אינו מותקן. התקן אותו באמצעות: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: לא הוגדר ספק. קריאה ל `setProvider()` עם מימוש של `SplashScreenProvider` (לדוגמה, מ- `@molecule/app-splash-screen-react-native`).',
}
