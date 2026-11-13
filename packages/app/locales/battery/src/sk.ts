import type { BatteryTranslations } from './types.js'

/** Battery translations for Slovak. */
export const sk: BatteryTranslations = {
  'battery.charging': 'Nabíjanie',
  'battery.discharging': 'Na batérii',
  'battery.full': 'Plne nabité',
  'battery.not-charging': 'Nenabíja sa',
  'battery.unknown': 'Neznáme',
  'battery.remainingUnknown': 'Neznáme',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nie je nastavený žiadny poskytovateľ. Zavolajte `setProvider()` s implementáciou `BatteryProvider` — Molecule preň neponúka žiadneho poskytovateľa; implementujte rozhranie vo vašom natívnom runtime prostredí a prepojte ho.',
}
