import type { StorageTranslations } from './types.js'

/** Storage translations for Chinese (Traditional). */
export const zhTW: StorageTranslations = {
  'storage.error.noProvider': '儲存提供者尚未設定。請先呼叫 setProvider()。',
  'storage.error.quotaExceeded': '設定金鑰 "{{key}}" 時儲存配額已超出',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage`未安裝。請使用以下指令安裝：`npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': '無法為 AsyncStorage 中的鍵「{{key}}」設定值。',
}
