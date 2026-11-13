import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Persian. */
export const fa: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'ارائه‌دهنده صفحه آغازین پیکربندی نشده است.',
  'splashScreen.warn.configureNotSupported':
    'configure() توسط این ارائه‌دهنده صفحه آغازین پشتیبانی نمی‌شود.',
  'splashScreen.error.missingDependency':
    '`{{library}}` مورد نیاز است اما نصب نشده است. آن را با دستور زیر نصب کنید: `npx expo install {{library}}`',
}
