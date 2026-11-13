import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Chinese. */
export const zh: SplashScreenTranslations = {
  'splashScreen.error.noProvider': '启动画面提供程序未配置。',
  'splashScreen.warn.configureNotSupported': 'configure() 不被此启动画面提供程序支持。',
  'splashScreen.error.missingDependency':
    '`{{library}}`是必需的，但尚未安装。请使用以下命令安装：`npx expo install {{library}}`',
}
