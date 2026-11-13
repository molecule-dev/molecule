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
    "`@molecule/app-battery`: Geen verskaffer gestel nie. Roep `setProvider()` met 'n `BatteryProvider` implementering — geen verskaffer word saam met die vloot gestuur nie; implementeer die koppelvlak op jou eie looptyd en koppel dit.",
}
