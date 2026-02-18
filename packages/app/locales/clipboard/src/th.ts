import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Thai. */
export const th: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: ยังไม่ได้ตั้งค่าผู้ให้บริการ เรียก setProvider() พร้อมการใช้งาน ClipboardProvider (เช่น จาก @molecule/app-clipboard-capacitor)',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ไม่ได้รับการสนับสนุนจากผู้ให้บริการ',
}
