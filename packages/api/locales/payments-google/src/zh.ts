import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Chinese. */
export const zh: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    '缺少 Google Play 软件包名称 (process.env.GOOGLE_PLAY_PACKAGE_NAME)。',
  'payments.google.warn.missingServiceKey':
    '缺少 Google API 服务密钥对象 (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)。',
  'payments.google.error.serviceKeyNotConfigured': 'Google API 服务密钥对象未配置',
  'payments.google.error.parseServiceKey': '解析 Google API 服务密钥对象时出错：',
}
