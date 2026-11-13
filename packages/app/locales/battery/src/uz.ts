import type { BatteryTranslations } from './types.js'

/** Battery translations for uz. */
export const uz: Partial<BatteryTranslations> = {
  'battery.charging': 'Quvvatlanmoqda',
  'battery.discharging': 'Batareyada',
  'battery.not-charging': 'Quvvatlanmayapti',
  'battery.remainingTime': '{{hours}}s {{minutes}}d',
  'battery.remainingMinutes': '{{minutes}}d',
  'battery.full': "To'liq zaryadlangan",
  'battery.unknown': "Noma'lum",
  'battery.remainingUnknown': "Noma'lum",
  'battery.error.noProvider':
    "`@molecule/app-battery`: Provayder o'rnatilmagan. `BatteryProvider` implementatsiyasi bilan `setProvider()` chaqiring — Molecule buning uchun provayder yubormaydi; interfeysni o'zingizning mahalliy ish vaqtingizda amalga oshiring va uni bog'lang.",
}
