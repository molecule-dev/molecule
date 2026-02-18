import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Korean. */
export const ko: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play 패키지 이름이 없습니다 (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API 서비스 키 객체가 없습니다 (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API 서비스 키 객체가 구성되지 않았습니다',
  'payments.google.error.parseServiceKey': 'Google API 서비스 키 객체 파싱 오류:',
}
