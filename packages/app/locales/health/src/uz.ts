import type { HealthTranslations } from './types.js'

/** Health translations for Uzbek. */
export const uz: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    "`@molecule/app-health`: Hech qanday tibbiy xizmat ko'rsatuvchi provayder bog'lanmagan — `HealthProvider` interfeysini o'zingizning mahalliy ish vaqtingizda (Apple HealthKit / Android Health Connect / Google Fit) amalga oshiring va uni ishga tushirishda `setProvider()` bilan bog'lang. Hech bir provayder flot bilan birga jo'natmaydi. Qo'ng'iroq qilishdan oldin `hasProvider()` yoki `getCapabilities().supported` yordamida xususiyatlarni aniqlang — tibbiy xizmat ko'rsatkichi halol standart holatga ega emas, shuning uchun bu soxta ma'lumotlarni qaytarish o'rniga tashlanadi.",
}
