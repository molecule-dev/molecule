import type { BatteryTranslations } from './types.js'

/** Battery translations for English. */
export const en: BatteryTranslations = {
  'battery.charging': 'Charging',
  'battery.discharging': 'On Battery',
  'battery.full': 'Fully Charged',
  'battery.not-charging': 'Not Charging',
  'battery.unknown': 'Unknown',
  'battery.remainingUnknown': 'Unknown',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: No provider set. Call `setProvider()` with a `BatteryProvider` implementation — no provider ships with the fleet; implement the interface on your native runtime and bond it.',
}
