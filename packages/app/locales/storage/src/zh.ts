import type { StorageTranslations } from './types.js'

/** Storage translations for Chinese. */
export const zh: StorageTranslations = {
  'storage.error.noProvider': '存储提供程序未配置。请先调用 setProvider()。',
  'storage.error.quotaExceeded': '设置键 "{{key}}" 时存储配额已超出',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage`未安装。请使用以下命令安装：`npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': '无法为 AsyncStorage 中的键“ {{key}} ”设置值。',
}
