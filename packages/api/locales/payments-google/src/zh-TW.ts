import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Chinese (Traditional). */
export const zhTW: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    '缺少 Google Play 套件名稱 (process.env.GOOGLE_PLAY_PACKAGE_NAME)。',
  'payments.google.warn.missingServiceKey':
    '缺少 Google API 服務金鑰物件 (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)。',
  'payments.google.error.serviceKeyNotConfigured': 'Google API 服務金鑰物件未設定',
  'payments.google.error.parseServiceKey': '解析 Google API 服務金鑰物件時發生錯誤：',
}
