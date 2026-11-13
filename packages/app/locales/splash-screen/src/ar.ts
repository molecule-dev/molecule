import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Arabic. */
export const ar: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() غير مدعوم من قبل مزود شاشة البداية هذا.',
  'splashScreen.error.missingDependency':
    '`{{library}}` مطلوبة ولكنها غير مثبتة. قم بتثبيتها باستخدام الأمر التالي: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: لم يتم تعيين موفر. قم باستدعاء `setProvider()` مع تطبيق `SplashScreenProvider` (على سبيل المثال، من `@molecule/app-splash-screen-react-native`).',
}
