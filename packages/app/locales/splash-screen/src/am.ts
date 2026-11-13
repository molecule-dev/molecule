import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Amharic. */
export const am: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() በዚህ የማስጀመሪያ ማያ ገጽ አቅራቢ አይደገፍም።',
  'splashScreen.error.missingDependency':
    '`{{library}}` ያስፈልጋል ግን አልተጫነም። በሚከተለው ይጫኑት፦ `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ምንም አቅራቢ አልተዘጋጀም። `setProvider()`ን በ`SplashScreenProvider` ትግበራ ይጥሩ (ለምሳሌ ከ`@molecule/app-splash-screen-react-native`)።',
}
