import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Japanese. */
export const ja: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Playパッケージ名がありません（process.env.GOOGLE_PLAY_PACKAGE_NAME）。',
  'payments.google.warn.missingServiceKey':
    'Google APIサービスキーオブジェクトがありません（process.env.GOOGLE_API_SERVICE_KEY_OBJECT）。',
  'payments.google.error.serviceKeyNotConfigured':
    'Google APIサービスキーオブジェクトが設定されていません',
  'payments.google.error.parseServiceKey': 'Google APIサービスキーオブジェクトの解析エラー:',
}
