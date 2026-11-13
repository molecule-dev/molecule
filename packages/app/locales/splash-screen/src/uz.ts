import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for uz. */
export const uz: Partial<SplashScreenTranslations> = {
  'splashScreen.warn.configureNotSupported':
    "configure() funksiyasi ushbu ekran provayderi tomonidan qo'llab-quvvatlanmaydi.",
  'splashScreen.error.missingDependency':
    "`{{library}}` talab qilinadi, lekin o'rnatilmagan. Uni quyidagi bilan o'rnating: `npx expo install {{library}}`",
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: Provayder o'rnatilmagan. `setProvider()` `SplashScreenProvider` implementatsiyasi bilan chaqiring (masalan, `@molecule/app-splash-screen-react-native` dan).",
}
