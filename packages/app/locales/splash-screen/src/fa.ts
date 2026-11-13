import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Persian. */
export const fa: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() توسط این ارائه‌دهنده صفحه آغازین پشتیبانی نمی‌شود.',
  'splashScreen.error.missingDependency':
    '`{{library}}` مورد نیاز است اما نصب نشده است. آن را با دستور زیر نصب کنید: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: هیچ ارائه‌دهنده‌ای تنظیم نشده است. `setProvider()` را با پیاده‌سازی `SplashScreenProvider` فراخوانی کنید (مثلاً از `@molecule/app-splash-screen-react-native`).',
}
