import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Gujarati. */
export const gu: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() આ સ્પ્લેશ સ્ક્રીન પ્રોવાઇડર દ્વારા સમર્થિત નથી.',
  'splashScreen.error.missingDependency':
    '`{{library}}` જરૂરી છે પણ ઇન્સ્ટોલ કરેલું નથી. તેને આની સાથે ઇન્સ્ટોલ કરો: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: કોઈ પ્રદાતા સેટ નથી. `SplashScreenProvider` અમલીકરણ સાથે `setProvider()` કૉલ કરો (દા.ત., `@molecule/app-splash-screen-react-native` માંથી).',
}
