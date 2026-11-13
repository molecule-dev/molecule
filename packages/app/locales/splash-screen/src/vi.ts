import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Vietnamese. */
export const vi: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() không được hỗ trợ bởi nhà cung cấp màn hình khởi động này.',
  'splashScreen.error.missingDependency':
    '`{{library}}` là bắt buộc nhưng chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Chưa thiết lập nhà cung cấp. Hãy gọi `setProvider()` với một triển khai `SplashScreenProvider` (ví dụ: từ `@molecule/app-splash-screen-react-native`).',
}
