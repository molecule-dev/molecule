import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Albanian. */
export const sq: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Ofruesi i ekranit te nisjes nuk eshte konfiguruar.',
  'splashScreen.warn.configureNotSupported':
    'configure() nuk mbeshtetet nga ky ofrues i ekranit te nisjes.',
  'splashScreen.error.missingDependency':
    '`{{library}}` është e detyrueshme, por nuk është instaluar. Instalojeni me: `npx expo install {{library}}`',
}
