import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Chinese. */
export const zh: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() 不被此启动画面提供程序支持。',
  'splashScreen.error.missingDependency':
    '`{{library}}`是必需的，但尚未安装。请使用以下命令安装：`npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`：未设置提供程序。请使用`SplashScreenProvider`实现（例如，来自`@molecule/app-splash-screen-react-native`）调用`setProvider()`。',
}
