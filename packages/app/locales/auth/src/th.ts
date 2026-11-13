import type { AuthTranslations } from './types.js'

/** Auth translations for Thai. */
export const th: AuthTranslations = {
  'auth.error.requestFailed': 'คำขอล้มเหลว',
  'auth.error.loginFailed': 'เข้าสู่ระบบล้มเหลว',
  'auth.error.registrationFailed': 'การลงทะเบียนล้มเหลว',
  'auth.error.noRefreshToken': 'ไม่มี refresh token ที่พร้อมใช้งาน',
  'auth.error.profileRequiresSignIn': 'โปรดเข้าสู่ระบบก่อนทำการอัปเดตโปรไฟล์',
  'auth.error.profileSessionChanged': 'มีการเปลี่ยนแปลงการตั้งค่าโปรไฟล์ก่อนการส่งข้อมูล',
  'auth.error.passwordRequiresSignIn': 'ลงชื่อเข้าใช้ก่อนเปลี่ยนรหัสผ่าน',
  'auth.error.passwordSessionChanged': 'รหัสผ่านของเซสชันถูกเปลี่ยนก่อนส่งข้อมูล',
}
