import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Thai. */
export const th: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() ไม่รองรับโดย splash screen provider นี้',
  'splashScreen.error.missingDependency':
    '`{{library}}` เป็นสิ่งที่จำเป็น แต่ยังไม่ได้ติดตั้ง ติดตั้งโดยใช้คำสั่ง: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ไม่ได้ตั้งค่า provider ไว้ เรียกใช้ `setProvider()` โดยใช้การใช้งาน `SplashScreenProvider` (เช่น จาก `@molecule/app-splash-screen-react-native`)',
}
