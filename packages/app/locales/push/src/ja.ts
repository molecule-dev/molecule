import type { PushTranslations } from './types.js'

/** Push translations for Japanese. */
export const ja: PushTranslations = {
  'push.error.notSupported': 'プッシュ通知はサポートされていません',
  'push.error.permissionNotGranted': '通知の権限が許可されていません',
  'push.error.missingDependency':
    '`{{library}}`が必要ですが、インストールされていません。以下のコマンドでインストールしてください: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'service worker が登録されていません。プッシュ通知には、@molecule/app-pwa-default をインストールしたアプリの本番ビルドが必要です。',
}
