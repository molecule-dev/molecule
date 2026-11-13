import type { BatteryTranslations } from './types.js'

/** Battery translations for de. */
export const de: Partial<BatteryTranslations> = {
  'battery.unknown': 'Unbekannt',
  'battery.remainingUnknown': 'Unbekannt',
  'battery.remainingMinutes': '{{minutes}} Min',
  'battery.charging': 'Laden',
  'battery.discharging': 'Im Akkubetrieb',
  'battery.full': 'Vollständig aufgeladen',
  'battery.not-charging': 'Lädt nicht',
  'battery.remainingTime': '{{hours}} H {{minutes}} M',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `BatteryProvider` Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
