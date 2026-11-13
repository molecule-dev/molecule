import type { AuthTranslations } from './types.js'

/** Auth translations for ar. */
export const ar: Partial<AuthTranslations> = {
  'auth.error.loginFailed': 'فشل تسجيل الدخول',
  'auth.error.requestFailed': 'فشل الطلب',
  'auth.error.registrationFailed': 'فشل التسجيل',
  'auth.error.noRefreshToken': 'لا يوجد رمز تحديث متاح',
  'auth.error.profileRequiresSignIn': 'قم بتسجيل الدخول قبل تحديث ملفك الشخصي',
  'auth.error.profileSessionChanged': 'تم تغيير جلسة الملف الشخصي قبل الإرسال',
  'auth.error.passwordRequiresSignIn': 'قم بتسجيل الدخول قبل تغيير كلمة المرور',
  'auth.error.passwordSessionChanged': 'تم تغيير جلسة كلمة المرور قبل الإرسال',
  'auth.error.requestTimedOut': 'انتهت مهلة طلب المصادقة',
}
