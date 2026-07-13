import type { IconsTranslations } from './types.js'

/** Icons translations for Thai. */
export const th: IconsTranslations = {
  'icons.error.noIconSet':
    'ไม่ได้ตั้งค่า IconSet ใดๆ เรียก setIconSet() เมื่อเริ่มต้นแอปด้วยไลบรารีไอคอน (เช่น @molecule/app-icons-molecule)',
  'icons.error.noProvider':
    '@molecule/app-icons: ไม่มีชุดไอคอนที่เชื่อมต่อ เรียก setIconSet() พร้อม IconSet (เช่น การส่งออกจาก @molecule/app-icons-molecule)',
  'icons.error.notFound': 'ไม่พบไอคอน "{{name}}" ในชุดไอคอนปัจจุบัน',
}
