import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Albanian. */
export const sq: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nuk mbeshtetet nga ky ofrues i ekranit te nisjes.',
  'splashScreen.error.missingDependency':
    '`{{library}}` është e detyrueshme, por nuk është instaluar. Instalojeni me: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nuk është caktuar asnjë ofrues. Thirrni `setProvider()` me një implementim `SplashScreenProvider` (p.sh., nga `@molecule/app-splash-screen-react-native`).',
}
