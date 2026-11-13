import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Mongolian. */
export const mn: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() энэ нээлтийн дэлгэцийн үйлчилгээ үзүүлэгчид дэмжигдэхгүй.',
  'splashScreen.error.missingDependency':
    '`{{library}}` шаардлагатай боловч суулгаагүй байна. Үүнийг дараах байдлаар суулгана уу: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Үйлчилгээ үзүүлэгч тохируулагдаагүй байна. `setProvider()` `SplashScreenProvider` хэрэгжүүлэлтээр дуудна уу (жишээ нь, `@molecule/app-splash-screen-react-native` аас).',
}
