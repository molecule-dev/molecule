import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Urdu. */
export const ur: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() اس سپلیش اسکرین فراہم کنندہ کے ذریعے معاون نہیں ہے۔',
  'splashScreen.error.missingDependency':
    '`{{library}}` درکار ہے لیکن انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: کوئی فراہم کنندہ سیٹ نہیں ہے۔ ایک `SplashScreenProvider` نفاذ کے ساتھ `setProvider()` کال کریں (مثال کے طور پر، `@molecule/app-splash-screen-react-native` سے)۔',
}
