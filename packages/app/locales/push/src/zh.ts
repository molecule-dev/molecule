import type { PushTranslations } from './types.js'

/** Push translations for Chinese. */
export const zh: PushTranslations = {
  'push.error.notSupported': '不支持推送通知',
  'push.error.permissionNotGranted': '未授予通知权限',
  'push.error.missingDependency':
    '`{{library}}`是必需的，但尚未安装。请使用以下命令安装：`npx expo install {{library}}`',
  'push.error.noServiceWorker':
    '未注册任何 service worker。推送通知需要安装了 @molecule/app-pwa-default 的应用生产构建。',
}
