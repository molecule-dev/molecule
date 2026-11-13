import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hindi. */
export const hi: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() इस स्प्लैश स्क्रीन प्रोवाइडर द्वारा समर्थित नहीं है।',
  'splashScreen.error.missingDependency':
    '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है। इसे निम्न कमांड से स्थापित करें: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: कोई प्रदाता सेट नहीं है। `SplashScreenProvider` कार्यान्वयन (उदाहरण के लिए, `@molecule/app-splash-screen-react-native` से) के साथ `setProvider()` को कॉल करें।',
}
