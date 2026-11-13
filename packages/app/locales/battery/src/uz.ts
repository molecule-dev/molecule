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
    "`@molecule/app-battery`: Provayder o'rnatilmagan. `setProvider()` `BatteryProvider` implementatsiyasi bilan chaqiring — hech qanday provayder flot bilan birga jo'natilmaydi; interfeysni o'zingizning mahalliy ish vaqtingizda amalga oshiring va uni bog'lang.",
}
