import type { BatteryTranslations } from './types.js'

/** Battery translations for Danish. */
export const da: BatteryTranslations = {
  'battery.charging': 'Oplader',
  'battery.discharging': 'På batteri',
  'battery.full': 'Fuldt opladet',
  'battery.not-charging': 'Oplader ikke',
  'battery.unknown': 'Ukendt',
  'battery.remainingUnknown': 'Ukendt',
  'battery.remainingTime': '{{hours}}t {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ingen provider angivet. Kald `setProvider()` med en `BatteryProvider` implementering — Molecule leverer ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
