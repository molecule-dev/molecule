import type { BiometricsTranslations } from './types.js'

/** Biometrics translations for Thai. */
export const th: BiometricsTranslations = {
  'biometrics.error.notSupported': 'ไม่รองรับ WebAuthn',
  'biometrics.error.noPlatformAuth': 'ไม่มี platform authenticator',
  'biometrics.error.checkFailed': 'เกิดข้อผิดพลาดในการตรวจสอบความพร้อมใช้งาน',
  'biometrics.error.noCredential': 'ไม่มี credential ที่ส่งกลับ',
  'biometrics.error.userCancel': 'ผู้ใช้ยกเลิกการยืนยันตัวตน',
  'biometrics.error.permissionDenied': 'สิทธิ์ถูกปฏิเสธ',
  'biometrics.error.unknown': 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
  'biometrics.device.fingerprint': 'ลายนิ้วมือ',
  'biometrics.device.faceId': 'Face ID',
  'biometrics.device.touchId': 'Touch ID',
  'biometrics.device.windowsHello': 'Windows Hello',
}
