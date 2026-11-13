import type { BatteryTranslations } from './types.js'

/** Battery translations for Maltese. */
export const mt: BatteryTranslations = {
  'battery.charging': 'Qed jiccargja',
  'battery.discharging': 'Fuq il-Batterija',
  'battery.full': 'Iccargijat Kompletament',
  'battery.not-charging': 'Mhux Qed Jiccargja',
  'battery.unknown': 'Mhux Maghruf',
  'battery.remainingUnknown': 'Mhux Maghruf',
  'battery.remainingTime': '{{hours}}s {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    "`@molecule/app-battery`: L-ebda fornitur ma ġie stabbilit. Sejħa `setProvider()` b'implimentazzjoni ta `BatteryProvider` — l-ebda fornitur ma jibgħat mal-flotta; implimenta l-interface fuq ir-runtime nattiv tiegħek u waħħalha.",
}
