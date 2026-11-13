import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Japanese. */
export const ja: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() はこのスプラッシュスクリーンプロバイダーではサポートされていません。',
  'splashScreen.error.missingDependency':
    '`{{library}}`が必要ですが、インストールされていません。以下のコマンドでインストールしてください: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: プロバイダーが設定されていません。`SplashScreenProvider` の実装（例: `@molecule/app-splash-screen-react-native`）を `setProvider()` で設定してください。',
}
