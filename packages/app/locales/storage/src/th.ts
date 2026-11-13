import type { StorageTranslations } from './types.js'

/** Storage translations for Thai. */
export const th: StorageTranslations = {
  'storage.error.noProvider':
    'ยังไม่ได้กำหนดค่าผู้ให้บริการจัดเก็บข้อมูล กรุณาเรียก setProvider() ก่อน',
  'storage.error.quotaExceeded': 'โควตาพื้นที่จัดเก็บข้อมูลเกินขีดจำกัดเมื่อตั้งค่าคีย์ "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ยังไม่ได้ติดตั้ง โปรดติดตั้งโดยใช้คำสั่ง: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'ไม่สามารถกำหนดค่าให้กับคีย์ " {{key}} " ใน AsyncStorage ได้',
}
