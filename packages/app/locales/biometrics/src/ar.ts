import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Arabic. */
export const ar: BiometricsTranslations = {
  'biometrics.error.notSupported': 'WebAuthn غير مدعوم',
  'biometrics.error.noPlatformAuth': 'لا يوجد مصادق منصة',
  'biometrics.error.checkFailed': 'خطأ في التحقق من التوفر',
  'biometrics.error.noCredential': 'لم يتم إرجاع أي بيانات اعتماد',
  'biometrics.error.userCancel': 'ألغى المستخدم المصادقة',
  'biometrics.error.permissionDenied': 'تم رفض الإذن',
  'biometrics.error.unknown': 'خطأ غير معروف',
  'biometrics.device.fingerprint': 'بصمة الإصبع',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
