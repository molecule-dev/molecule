import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Nepali. */
export const ne: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'स्प्लास स्क्रिन प्रोभाइडर कन्फिगर गरिएको छैन।',
  'splashScreen.warn.configureNotSupported':
    'configure() यो स्प्लास स्क्रिन प्रोभाइडरद्वारा समर्थित छैन।',
  'splashScreen.error.missingDependency':
    '`{{library}}` आवश्यक छ तर स्थापना गरिएको छैन। यसलाई निम्नसँग स्थापना गर्नुहोस्: `npx expo install {{library}}`',
}
