import type { BatteryTranslations } from './types.js'

/** Battery translations for it. */
export const it: Partial<BatteryTranslations> = {
  'battery.unknown': 'Sconosciuto',
  'battery.remainingUnknown': 'Sconosciuto',
  'battery.charging': 'Addebito',
  'battery.discharging': 'A batteria',
  'battery.full': 'Completamente carico',
  'battery.not-charging': 'Non carica',
  'battery.remainingTime': '{{hours}} H {{minutes}} M',
  'battery.remainingMinutes': '{{minutes}} M',
  'battery.error.noProvider':
    "`@molecule/app-battery`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `BatteryProvider` : nessun provider è incluso nella flotta; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
