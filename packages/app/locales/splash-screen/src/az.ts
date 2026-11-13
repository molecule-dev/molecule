import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Azerbaijani. */
export const az: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Başlanğıc ekranı provayderi konfiqurasiya edilməyib.',
  'splashScreen.warn.configureNotSupported':
    'configure() bu başlanğıc ekranı provayderi tərəfindən dəstəklənmir.',
  'splashScreen.error.missingDependency':
    '`{{library}}` tələb olunur, lakin quraşdırılmayıb. Bunu bu şəkildə quraşdırın: `npx expo install {{library}}`',
}
