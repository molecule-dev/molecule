import type { StorageTranslations } from './types.js'

/** Storage translations for Vietnamese. */
export const vi: StorageTranslations = {
  'storage.error.noProvider':
    'Nhà cung cấp lưu trữ chưa được cấu hình. Hãy gọi setProvider() trước.',
  'storage.error.quotaExceeded': 'Đã vượt quá hạn mức lưu trữ khi thiết lập khóa "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Không thể thiết lập giá trị cho khóa " {{key}} " trong AsyncStorage',
}
