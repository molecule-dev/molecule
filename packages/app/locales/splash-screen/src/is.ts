import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Icelandic. */
export const is: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() er ekki stutt af þessum upphafsskjár þjónustuaðila.',
  'splashScreen.error.missingDependency':
    '`{{library}}` er krafist en ekki uppsett. Setjið það upp með: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Enginn veitandi stilltur. Kallaðu á `setProvider()` með `SplashScreenProvider` útfærslu (t.d. frá `@molecule/app-splash-screen-react-native`).',
}
