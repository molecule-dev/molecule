import type { BatteryTranslations } from './types.js'

/** Battery translations for Romanian. */
export const ro: BatteryTranslations = {
  'battery.charging': 'Se încarcă',
  'battery.discharging': 'Pe baterie',
  'battery.full': 'Complet încărcată',
  'battery.not-charging': 'Nu se încarcă',
  'battery.unknown': 'Necunoscut',
  'battery.remainingUnknown': 'Necunoscut',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare `BatteryProvider` — niciun furnizor nu este inclus în flota; implementați interfața pe runtime-ul nativ și conectați-o la un link.',
}
