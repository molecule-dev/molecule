import type { BatteryTranslations } from './types.js'

/** Battery translations for Igbo. */
export const ig: BatteryTranslations = {
  'battery.charging': 'Na-achaji',
  'battery.discharging': 'Na batrị',
  'battery.full': 'Juru eju',
  'battery.not-charging': 'Anaghị achaji',
  'battery.unknown': 'Amaghị',
  'battery.remainingUnknown': 'Amaghị',
  'battery.remainingTime': '{{hours}}ch {{minutes}}nk',
  'battery.remainingMinutes': '{{minutes}}nk',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Enweghị onye na-enye ọrụ. Kpọọ `setProvider()` site na iji `BatteryProvider` — ọ dịghị onye na-enye ọrụ na-ebuga ya na ndị ọrụ; tinye interface ahụ na oge ọrụ gị wee jikọta ya.',
}
