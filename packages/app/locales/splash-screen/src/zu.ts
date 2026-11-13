import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Zulu. */
export const zu: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ayisekelwe yilo mhlinzeki wesikrini sokuqala.',
  'splashScreen.error.missingDependency':
    '`{{library}}` iyadingeka kodwa ayifakiwe. Faka nge: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Akukho mhlinzeki osethiwe. Shayela `setProvider()` ngokusetshenziswa kwe `SplashScreenProvider` (isb., kusuka ku `@molecule/app-splash-screen-react-native`).',
}
