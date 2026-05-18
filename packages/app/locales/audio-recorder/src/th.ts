import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for th. */
export const th: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง',
  'audioRecorder.error': 'การบันทึกไม่สำเร็จ โปรดลองอีกครั้ง',
  'audioRecorder.permissionDenied':
    'ไม่อนุญาตให้เข้าถึงไมโครโฟน โปรดอนุญาตการเข้าถึงแล้วลองใหม่อีกครั้ง',
  'audioRecorder.pause': 'หยุดชั่วคราว',
  'audioRecorder.resume': 'ประวัติย่อ',
  'audioRecorder.stop': 'หยุด',
  'audioRecorder.elapsed': 'เวลาที่ผ่านไป<x> {{เวลา}}</x>',
  'audioRecorder.statusPaused': 'หยุดชั่วคราว',
  'audioRecorder.statusProcessed': 'บันทึกแล้ว',
  'audioRecorder.statusError': 'ข้อผิดพลาด',
  'audioRecorder.statusIdle': 'พร้อมบันทึกแล้ว',
  'audioRecorder.group': 'เครื่องบันทึกเสียง',
}
