import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Urdu. */
export const ur: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'سپلیش اسکرین فراہم کنندہ ترتیب نہیں دیا گیا ہے۔',
  'splashScreen.warn.configureNotSupported':
    'configure() اس سپلیش اسکرین فراہم کنندہ کے ذریعے معاون نہیں ہے۔',
  'splashScreen.error.missingDependency':
    '`{{library}}` درکار ہے لیکن انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npx expo install {{library}}`',
}
