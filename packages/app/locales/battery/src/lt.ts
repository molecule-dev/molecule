import type { BatteryTranslations } from './types.js'

/** Battery translations for Lithuanian. */
export const lt: BatteryTranslations = {
  'battery.charging': 'Kraunasi',
  'battery.discharging': 'Naudojama baterija',
  'battery.full': 'Pilnai Ikrauta',
  'battery.not-charging': 'Nesikrauna',
  'battery.unknown': 'Nežinoma',
  'battery.remainingUnknown': 'Nežinoma',
  'battery.remainingTime': '{{hours}}val {{minutes}}min',
  'battery.remainingMinutes': '{{minutes}}min',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Tiekėjas nenustatytas. Iškvieskite `setProvider()` su `BatteryProvider` įdiegimu – tiekėjas nepridedamas prie parko; įdiekite sąsają savo gimtojoje vykdymo aplinkoje ir ją sujunkite.',
}
