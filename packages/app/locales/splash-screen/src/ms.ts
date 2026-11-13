import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Malay. */
export const ms: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() tidak disokong oleh pembekal skrin percikan ini.',
  'splashScreen.error.missingDependency':
    '`{{library}}` diperlukan tetapi tidak dipasang. Pasangkannya dengan: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Tiada pembekal ditetapkan. Panggil `setProvider()` dengan pelaksanaan `SplashScreenProvider` (cth., daripada `@molecule/app-splash-screen-react-native`).',
}
