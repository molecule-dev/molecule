import type { BatteryTranslations } from './types.js'

/** Battery translations for Afrikaans. */
export const af: BatteryTranslations = {
  'battery.charging': 'Laai',
  'battery.discharging': 'Op Battery',
  'battery.full': 'Volledig Gelaai',
  'battery.not-charging': 'Laai Nie',
  'battery.unknown': 'Onbekend',
  'battery.remainingUnknown': 'Onbekend',
  'battery.remainingTime': '{{hours}}u {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    "`@molecule/app-battery`: Geen verskaffer gestel nie. Roep `setProvider()` aan met 'n `BatteryProvider` implementering — Molecule stuur geen verskaffer daarvoor nie; implementeer die koppelvlak op jou oorspronklike looptyd en koppel dit.",
}
