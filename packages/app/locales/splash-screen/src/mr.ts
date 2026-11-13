import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Marathi. */
export const mr: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() या स्प्लॅश स्क्रीन प्रोव्हायडरद्वारे समर्थित नाही.',
  'splashScreen.error.missingDependency':
    '`{{library}}` आवश्यक आहे, परंतु स्थापित केलेले नाही. ते या कमांडने स्थापित करा: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: कोणताही प्रोव्हायडर सेट केलेला नाही. `SplashScreenProvider` इम्प्लिमेंटेशनसह `setProvider()` कॉल करा (उदा., `@molecule/app-splash-screen-react-native` मधून).',
}
