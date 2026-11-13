import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Vietnamese. */
export const vi: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Nhà cung cấp màn hình khởi động chưa được cấu hình.',
  'splashScreen.warn.configureNotSupported':
    'configure() không được hỗ trợ bởi nhà cung cấp màn hình khởi động này.',
  'splashScreen.error.missingDependency':
    '`{{library}}` là bắt buộc nhưng chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npx expo install {{library}}`',
}
