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
    '`@molecule/app-battery`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare a `BatteryProvider` — Molecule nu oferă niciun furnizor pentru aceasta; implementați interfața pe runtime-ul nativ și creați un link între ele.',
}
