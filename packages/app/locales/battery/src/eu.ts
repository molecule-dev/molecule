import type { BatteryTranslations } from './types.js'

/** Battery translations for Basque. */
export const eu: BatteryTranslations = {
  'battery.charging': 'Kargatzen',
  'battery.discharging': 'Bateriarekin',
  'battery.full': 'Erabat kargatuta',
  'battery.not-charging': 'Ez da kargatzen ari',
  'battery.unknown': 'Ezezaguna',
  'battery.remainingUnknown': 'Ezezaguna',
  'battery.remainingTime': '{{hours}}o {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ez da hornitzailerik ezarri. Deitu `setProvider()` `BatteryProvider` inplementazio batekin — ez dago hornitzailerik flotarekin batera; inplementatu interfazea zure jatorrizko exekuzio-denboran eta lotu ezazu.',
}
