import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Nepali. */
export const ne: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() यो स्प्लास स्क्रिन प्रोभाइडरद्वारा समर्थित छैन।',
  'splashScreen.error.missingDependency':
    '`{{library}}` आवश्यक छ तर स्थापना गरिएको छैन। यसलाई निम्नसँग स्थापना गर्नुहोस्: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: कुनै प्रदायक सेट गरिएको छैन। `SplashScreenProvider` कार्यान्वयनको साथ `setProvider()` लाई कल गर्नुहोस् (जस्तै, `@molecule/app-splash-screen-react-native` बाट)।',
}
