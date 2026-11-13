import type { BatteryTranslations } from './types.js'

/** Battery translations for Slovenian. */
export const sl: BatteryTranslations = {
  'battery.charging': 'Polnjenje',
  'battery.discharging': 'Na bateriji',
  'battery.full': 'Polno napolnjeno',
  'battery.not-charging': 'Se ne polni',
  'battery.unknown': 'Neznano',
  'battery.remainingUnknown': 'Neznano',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ponudnik ni nastavljen. Pokličite `setProvider()` z implementacijo `BatteryProvider` – Molecule zanj ne dobavlja nobenega ponudnika; implementirajte vmesnik v svojem izvornem izvajalnem okolju in ga povežite.',
}
