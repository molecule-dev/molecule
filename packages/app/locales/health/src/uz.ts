import type { HealthTranslations } from './types.js'

/** Health translations for Uzbek. */
export const uz: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    "`@molecule/app-health`: Hech qanday tibbiy xizmat ko'rsatuvchi provayder bog'lanmagan — o'zingizning mahalliy ish vaqtingizda (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` interfeysini amalga oshiring va uni ishga tushirishda `setProvider()` bilan bog'lang. Molecule buning uchun hech qanday provayder yubormaydi. Qo'ng'iroq qilishdan oldin `hasProvider()` yoki `getCapabilities().supported` bilan funksiyalarni aniqlang — tibbiy xizmat ko'rsatishni o'qishda halol standart holat yo'q, shuning uchun bu soxta ma'lumotlarni qaytarish o'rniga uni tashlaydi.",
}
