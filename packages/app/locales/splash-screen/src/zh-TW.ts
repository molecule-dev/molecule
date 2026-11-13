import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Chinese (Traditional). */
export const zhTW: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() 不被此啟動畫面提供者支援。',
  'splashScreen.error.missingDependency':
    '`{{library}}`是必要的，但尚未安裝。請使用以下指令安裝：`npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`：未設定提供者。請使用`SplashScreenProvider`實作（例如，來自`@molecule/app-splash-screen-react-native`）呼叫`setProvider()`。',
}
