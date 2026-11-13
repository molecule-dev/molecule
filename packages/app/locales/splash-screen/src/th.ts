import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Thai. */
export const th: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'ยังไม่ได้กำหนดค่า splash screen provider',
  'splashScreen.warn.configureNotSupported': 'configure() ไม่รองรับโดย splash screen provider นี้',
  'splashScreen.error.missingDependency':
    '`{{library}}` เป็นสิ่งที่จำเป็น แต่ยังไม่ได้ติดตั้ง ติดตั้งโดยใช้คำสั่ง: `npx expo install {{library}}`',
}
