import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Chinese (Traditional). */
export const zhTW: SplashScreenTranslations = {
  'splashScreen.error.noProvider': '啟動畫面提供者未設定。',
  'splashScreen.warn.configureNotSupported': 'configure() 不被此啟動畫面提供者支援。',
  'splashScreen.error.missingDependency':
    '`{{library}}`是必要的，但尚未安裝。請使用以下指令安裝：`npx expo install {{library}}`',
}
