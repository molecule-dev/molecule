import type { BatteryTranslations } from './types.js'

/** Battery translations for pl. */
export const pl: Partial<BatteryTranslations> = {
  'battery.unknown': 'Nieznany',
  'battery.remainingUnknown': 'Nieznany',
  'battery.charging': 'Ładowanie',
  'battery.discharging': 'Na baterii',
  'battery.full': 'W pełni naładowany',
  'battery.not-charging': 'Brak ładowania',
  'battery.remainingTime': '{{hours}} H {{minutes}} M',
  'battery.remainingMinutes': '{{minutes}} M',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `BatteryProvider` — Molecule nie dostarcza dla niego żadnego dostawcy; zaimplementuj interfejs w swoim natywnym środowisku wykonawczym i powiąż go.',
}
