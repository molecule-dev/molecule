import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Japanese. */
export const ja: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'スプラッシュスクリーンプロバイダーが設定されていません。',
  'splashScreen.warn.configureNotSupported':
    'configure() はこのスプラッシュスクリーンプロバイダーではサポートされていません。',
  'splashScreen.error.missingDependency':
    '`{{library}}`が必要ですが、インストールされていません。以下のコマンドでインストールしてください: `npx expo install {{library}}`',
}
