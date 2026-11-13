import type { PushTranslations } from './types.js'

/** Push translations for Chinese (Traditional). */
export const zhTW: PushTranslations = {
  'push.error.notSupported': '不支援推播通知',
  'push.error.permissionNotGranted': '未授予通知權限',
  'push.error.missingDependency':
    '`{{library}}`是必要的，但尚未安裝。請使用以下指令安裝：`npx expo install {{library}}`',
}
