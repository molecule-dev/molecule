import type { BatteryTranslations } from './types.js'

/** Battery translations for Filipino. */
export const fil: BatteryTranslations = {
  'battery.charging': 'Nagcha-charge',
  'battery.discharging': 'Sa Baterya',
  'battery.full': 'Puno na ang Baterya',
  'battery.not-charging': 'Hindi Nagcha-charge',
  'battery.unknown': 'Hindi Alam',
  'battery.remainingUnknown': 'Hindi Alam',
  'battery.remainingTime': '{{hours}}o {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Walang nakatakdang provider. Tawagin ang `setProvider()` gamit ang isang implementasyong `BatteryProvider` — Walang ipinapadalang provider ang Molecule para dito; ipatupad ang interface sa iyong native runtime at i-bond ito.',
}
