import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Indonesian. */
export const id: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Provider splash screen belum dikonfigurasi.',
  'splashScreen.warn.configureNotSupported':
    'configure() tidak didukung oleh provider splash screen ini.',
  'splashScreen.error.missingDependency':
    '`{{library}}` diperlukan tetapi belum terpasang. Pasang dengan: `npx expo install {{library}}`',
}
