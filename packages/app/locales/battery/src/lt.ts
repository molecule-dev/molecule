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
    '`@molecule/app-battery`: Nenustatytas tiekėjas. Iškvieskite `setProvider()` su `BatteryProvider` įdiegimu — „Molecule“ neteikia jokio tiekėjo; įdiekite sąsają savo gimtojoje vykdymo aplinkoje ir ją sujunkite.',
}
