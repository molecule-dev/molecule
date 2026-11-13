import type { BatteryTranslations } from './types.js'

/** Battery translations for Czech. */
export const cs: BatteryTranslations = {
  'battery.charging': 'Nabíjení',
  'battery.discharging': 'Na baterii',
  'battery.full': 'Plně nabito',
  'battery.not-charging': 'Nenabíjí se',
  'battery.unknown': 'Neznámé',
  'battery.remainingUnknown': 'Neznámé',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `BatteryProvider` — Molecule pro něj neposkytuje žádného poskytovatele; implementujte rozhraní ve svém nativním běhovém prostředí a propojte ho.',
}
