import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Mongolian. */
export const mn: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Нээлтийн дэлгэцийн үйлчилгээ үзүүлэгч тохируулагдаагүй.',
  'splashScreen.warn.configureNotSupported':
    'configure() энэ нээлтийн дэлгэцийн үйлчилгээ үзүүлэгчид дэмжигдэхгүй.',
  'splashScreen.error.missingDependency':
    '`{{library}}` шаардлагатай боловч суулгаагүй байна. Үүнийг дараах байдлаар суулгана уу: `npx expo install {{library}}`',
}
